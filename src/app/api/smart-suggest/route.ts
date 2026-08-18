import { NextRequest, NextResponse } from "next/server";

export interface SmartSuggestion {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  reason: string;
  confidence: number; // 0..1
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hour = parseInt(url.searchParams.get("hour") ?? String(new Date().getHours()), 10);
    const weather = url.searchParams.get("weather") ?? "Sunny";
    const journeySummary = url.searchParams.get("journeys") ?? "none";
    const currentLocation = url.searchParams.get("location") ?? "";

    // Generate contextual suggestions based on time-of-day heuristics
    // (with LLM enhancement when available)
    const suggestions = generateHeuristicSuggestions(
      hour,
      weather,
      journeySummary,
      currentLocation,
    );

    // Try to enhance with LLM
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      const suggestionContext = suggestions
        .map((s) => `${s.fromName} → ${s.toName}: ${s.reason}`)
        .join("\n");

      const response = await zai.chat.completions.create({
        model: "glm-4-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a campus navigation assistant for IIT Gandhinagar. Respond ONLY with a JSON array of objects with fields: from, to, reason, confidence (0-1). No markdown, no explanation outside the JSON. from/to must be location slugs like 'ab1', 'lhc', 'dining-hall', 'hostel-3', 'library', 'sports-complex', 'admin-block'.",
          },
          {
            role: "user",
            content: `Current time: ${hour}:00. Weather: ${weather}. Recent journeys: ${journeySummary}. Current location: ${currentLocation || "unknown"}. Heuristic suggestions:\n${suggestionContext}\n\nReturn 3 smart route suggestions as a JSON array. You may refine the heuristic suggestions or add new ones based on the context.`,
          },
        ],
      });

      const content = response.choices?.[0]?.message?.content?.trim() ?? "";
      // Try to parse the LLM response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          from: string;
          to: string;
          reason: string;
          confidence: number;
        }>;
        // Merge with location name lookup
        const nameMap: Record<string, string> = {
          "ab1": "Academic Block 1",
          "ab2": "Academic Block 2",
          "ab3": "Academic Block 3",
          "lhc": "Lecture Hall Complex",
          "dining-hall": "Dining Hall",
          "hostel-1": "Hostel 1",
          "hostel-2": "Hostel 2",
          "hostel-3": "Hostel 3",
          "hostel-4": "Hostel 4",
          "hostel-5": "Hostel 5",
          "library": "Library",
          "sports-complex": "Sports Complex",
          "admin-block": "Admin Block",
          "main-gate": "Main Gate",
          "research-park": "Research Park",
        };
        const llmSuggestions: SmartSuggestion[] = parsed.slice(0, 3).map((s) => ({
          from: s.from,
          to: s.to,
          fromName: nameMap[s.from] ?? s.from,
          toName: nameMap[s.to] ?? s.to,
          reason: s.reason,
          confidence: Math.min(1, Math.max(0, s.confidence ?? 0.7)),
        }));
        if (llmSuggestions.length > 0) {
          return NextResponse.json({ suggestions: llmSuggestions, source: "llm" });
        }
      }
    } catch (llmErr) {
      console.warn("LLM smart-suggest failed, using heuristics:", llmErr);
    }

    // Fallback: return heuristic suggestions
    return NextResponse.json({ suggestions, source: "heuristic" });
  } catch (err) {
    console.error("Smart-suggest error:", err);
    return NextResponse.json(
      { error: "Internal smart-suggest error" },
      { status: 500 },
    );
  }
}

/**
 * Time-of-day + weather heuristic suggestion engine.
 */
function generateHeuristicSuggestions(
  hour: number,
  weather: string,
  journeySummary: string,
  currentLocation: string,
): SmartSuggestion[] {
  const nameMap: Record<string, string> = {
    "ab1": "Academic Block 1",
    "ab2": "Academic Block 2",
    "ab3": "Academic Block 3",
    "lhc": "Lecture Hall Complex",
    "dining-hall": "Dining Hall",
    "hostel-1": "Hostel 1",
    "hostel-2": "Hostel 2",
    "hostel-3": "Hostel 3",
    "hostel-4": "Hostel 4",
    "hostel-5": "Hostel 5",
    "library": "Library",
    "sports-complex": "Sports Complex",
    "admin-block": "Admin Block",
    "main-gate": "Main Gate",
  };

  const suggestions: SmartSuggestion[] = [];

  // Time-based patterns
  if (hour >= 7 && hour < 10) {
    // Morning: hostel → academic
    suggestions.push({
      from: currentLocation || "hostel-3",
      to: "ab1",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Hostel 3"),
      toName: "Academic Block 1",
      reason: "Morning class time — heading to academic area",
      confidence: 0.85,
    });
    suggestions.push({
      from: currentLocation || "hostel-2",
      to: "lhc",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Hostel 2"),
      toName: "Lecture Hall Complex",
      reason: "Morning lecture — LHC is popular for early classes",
      confidence: 0.78,
    });
  } else if (hour >= 10 && hour < 13) {
    // Late morning: academic → dining or between academic blocks
    suggestions.push({
      from: currentLocation || "ab1",
      to: "ab3",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Academic Block 1"),
      toName: "Academic Block 3",
      reason: "Moving between classes in different blocks",
      confidence: 0.72,
    });
    suggestions.push({
      from: currentLocation || "lhc",
      to: "dining-hall",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Lecture Hall Complex"),
      toName: "Dining Hall",
      reason: "Lunch break approaching — head to dining hall",
      confidence: 0.8,
    });
  } else if (hour >= 13 && hour < 15) {
    // Lunch: → dining hall or back to academic
    suggestions.push({
      from: currentLocation || "ab2",
      to: "dining-hall",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Academic Block 2"),
      toName: "Dining Hall",
      reason: "Lunch time — dining hall is the go-to",
      confidence: 0.9,
    });
    suggestions.push({
      from: "dining-hall",
      to: "library",
      fromName: "Dining Hall",
      toName: "Library",
      reason: "Post-lunch study session at the library",
      confidence: 0.65,
    });
  } else if (hour >= 15 && hour < 18) {
    // Afternoon: academic → library or sports
    suggestions.push({
      from: currentLocation || "ab1",
      to: "library",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Academic Block 1"),
      toName: "Library",
      reason: "Afternoon study time — library is quiet and comfortable",
      confidence: 0.75,
    });
    suggestions.push({
      from: currentLocation || "ab3",
      to: "sports-complex",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Academic Block 3"),
      toName: "Sports Complex",
      reason: "Afternoon workout — sports complex has all facilities",
      confidence: 0.68,
    });
  } else if (hour >= 18 && hour < 21) {
    // Evening: academic → hostel, or sports
    suggestions.push({
      from: currentLocation || "library",
      to: "hostel-3",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Library"),
      toName: "Hostel 3",
      reason: "Evening — returning to hostel after studying",
      confidence: 0.82,
    });
    suggestions.push({
      from: currentLocation || "ab2",
      to: "sports-complex",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Academic Block 2"),
      toName: "Sports Complex",
      reason: "Evening sports — unwind before dinner",
      confidence: 0.7,
    });
  } else {
    // Night: → hostel
    suggestions.push({
      from: currentLocation || "library",
      to: "hostel-3",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Library"),
      toName: "Hostel 3",
      reason: "Late evening — head back to your hostel",
      confidence: 0.88,
    });
  }

  // Weather-based adjustment
  if (weather === "Rainy") {
    suggestions.push({
      from: currentLocation || "hostel-2",
      to: "lhc",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Hostel 2"),
      toName: "Lecture Hall Complex",
      reason: "Rainy day — LHC has covered walkways",
      confidence: 0.76,
    });
  } else if (weather === "Hot") {
    suggestions.push({
      from: currentLocation || "ab1",
      to: "library",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Academic Block 1"),
      toName: "Library",
      reason: "Hot outside — library is air-conditioned and shaded",
      confidence: 0.8,
    });
  }

  // Add a wildcard suggestion if we have room
  if (suggestions.length < 3) {
    suggestions.push({
      from: currentLocation || "hostel-1",
      to: "main-gate",
      fromName: nameMap[currentLocation] ?? (currentLocation || "Hostel 1"),
      toName: "Main Gate",
      reason: "Heading out — main gate for deliveries or off-campus",
      confidence: 0.5,
    });
  }

  return suggestions.slice(0, 3);
}
