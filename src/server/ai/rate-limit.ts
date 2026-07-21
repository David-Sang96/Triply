// Generous timeout for outbound Gemini calls. The dev server's Node fetch
// shim (used when running API routes locally, unlike the Cloudflare Workers
// runtime in production) has been observed to time out well before Gemini
// actually responds, especially on a cold "flash-latest" call — this
// overrides that with `httpOptions.timeout` (ms) on the GoogleGenAI client.
export const GEMINI_TIMEOUT_MS = 45_000;

// Detect rate-limit / quota errors from the free-tier AI service (mainly
// Gemini's 429 RESOURCE_EXHAUSTED, plus "overloaded" / 503 transient states).
// Checks the message, stack, and a JSON dump so wrapped errors are still caught.
export function isRateLimitError(err: unknown): boolean {
  let text =
    err instanceof Error
      ? `${err.name} ${err.message} ${err.stack ?? ""}`
      : String(err);
  try {
    text += " " + JSON.stringify(err);
  } catch {
    // ignore non-serializable errors
  }
  return /\b429\b|resource_exhausted|rate.?limit|too many requests|quota|overloaded|unavailable|503/i.test(
    text,
  );
}
