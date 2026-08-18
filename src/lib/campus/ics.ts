/**
 * ICS (iCalendar) file generator for campus events.
 *
 * Builds a valid RFC 5545 VCALENDAR → VEVENT string that can be imported
 * into Google Calendar, Apple Calendar, Outlook, etc.
 *
 * No external libraries — the ICS format is simple enough to construct by
 * hand with plain Date objects.
 */

/** Input shape for a single event. */
export interface IcsEventInput {
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  venue: string;
  organizer: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Convert an ISO 8601 string to ICS UTC format: YYYYMMDDTHHMMSSZ */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    pad(d.getUTCFullYear(), 4) +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Simple deterministic hash from a string → hex (up to 16 chars). */
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Fold long lines at 75 octets per RFC 5545 §3.1.
 * Each continuation line is prefixed with a space.
 */
function foldLine(line: string): string {
  const MAX = 75;
  if (line.length <= MAX) return line;
  const parts: string[] = [];
  let i = 0;
  // First chunk is 75 chars; subsequent chunks are 74 (because of the
  // leading space that acts as the fold indicator).
  parts.push(line.slice(0, MAX));
  i = MAX;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + MAX - 1));
    i += MAX - 1;
  }
  return parts.join("\r\n");
}

/** Escape special characters in ICS text values (RFC 5545 §3.3.11). */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/* ── Main generator ───────────────────────────────────────────────────── */

/**
 * Generate a complete ICS (iCalendar) file string for the given event.
 *
 * @param event  Event data (title, description, start/end times, venue, organizer)
 * @returns       A valid VCALENDAR string ready to serve as `text/calendar`
 */
export function generateIcs(event: IcsEventInput): string {
  const dtStart = toIcsUtc(event.startTime);
  const dtEnd = toIcsUtc(event.endTime);
  const uid = `${simpleHash(event.title + dtStart)}@iitgn-walk`;
  const now = toIcsUtc(new Date().toISOString());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IITGN Walk//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.venue)}`,
    `ORGANIZER;CN=${escapeIcsText(event.organizer)}:mailto:noreply@iitgn.ac.in`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // Fold each line that exceeds 75 chars and join with CRLF (RFC 5545).
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
