import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text as string;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'text' field" },
        { status: 400 },
      );
    }

    // Truncate to 500 chars for safety
    const safeText = text.trim().slice(0, 500);

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      // The installed SDK type doesn't expose the `tts` namespace cleanly,
      // so cast to a minimal any-typed surface that supports both shapes
      // (zai.tts.create({...}) and zai.audio.speech.create({...})).
      const z = zai as unknown as {
        tts?: { create: (args: { text: string; voice: string }) => Promise<unknown> };
        audio?: { speech?: { create: (args: { input: string; voice: string }) => Promise<unknown> } };
      };
      const audio: unknown = z.tts
        ? await z.tts.create({ text: safeText, voice: "alloy" })
        : await z.audio?.speech?.create({ input: safeText, voice: "alloy" });

      // BodyInit accepts ArrayBuffer or Uint8Array, but NOT Node's Buffer directly.
      let bodyBytes: Uint8Array;
      if (Buffer.isBuffer(audio)) {
        bodyBytes = new Uint8Array(audio);
      } else if (audio instanceof Uint8Array) {
        bodyBytes = audio;
      } else if (audio instanceof ArrayBuffer) {
        bodyBytes = new Uint8Array(audio);
      } else if (audio && typeof audio === "object" && "byteLength" in audio) {
        // ArrayBufferView (e.g. Uint8Array from SDK without proper instanceof)
        bodyBytes = new Uint8Array(
          audio as ArrayBufferLike,
          (audio as ArrayBufferView).byteOffset ?? 0,
          (audio as ArrayBufferView).byteLength,
        );
      } else {
        throw new Error("Unrecognized audio payload type from TTS SDK");
      }

      // BodyInit accepts ArrayBuffer or Blob, but TypeScript 5.7's generic
      // Uint8Array<ArrayBufferLike> isn't directly assignable to BlobPart.
      // Pass the underlying ArrayBuffer slice (which IS a valid BlobPart).
      const ab = bodyBytes.buffer.slice(
        bodyBytes.byteOffset,
        bodyBytes.byteOffset + bodyBytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([ab], { type: "audio/mpeg" });
      return new NextResponse(blob, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(bodyBytes.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch (sdkErr) {
      console.warn("TTS SDK error, returning fallback signal:", sdkErr);
      // Return a minimal valid mp3 silence so the client can still play something
      // Minimal silent MP3 frame (32kbps, 22050Hz, mono) ~ 72 bytes
      const silenceBase64 =
        "//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mb3QlAAAAAQAAAGF3YXJlAAAA//uQxBAACAAAAHQAAPBAAB4AAAQAAAAI";
      const silenceBuf = Buffer.from(silenceBase64, "base64");
      const silenceBytes = new Uint8Array(silenceBuf);
      const silenceAb = silenceBytes.buffer.slice(
        silenceBytes.byteOffset,
        silenceBytes.byteOffset + silenceBytes.byteLength,
      ) as ArrayBuffer;
      const silenceBlob = new Blob([silenceAb], { type: "audio/mpeg" });
      return new NextResponse(silenceBlob, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(silenceBytes.byteLength),
          "X-TTS-Fallback": "true",
        },
      });
    }
  } catch (err) {
    console.error("TTS route error:", err);
    return NextResponse.json(
      { error: "Internal TTS error" },
      { status: 500 },
    );
  }
}
