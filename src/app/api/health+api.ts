// GET /health — a liveness probe for uptime checks and post-deploy smoke tests.
//
// Deliberately minimal: no auth, no database, no third-party call. It answers
// one question — "is the Worker serving?" — and nothing else. That separation
// is the point: a broken DATABASE_URL still returns ok here, so a red health
// check means the deploy itself is down, which is a different problem with a
// different fix. Use `/api/trips` (a clean 401 when signed out) to prove the
// auth path, and the Sentry curl in PLAN.md Phase 7 to prove error reporting.
//
// It also stays cheap on purpose. Every `neon-http` query counts against
// Cloudflare's per-request subrequest limit, and an uptime monitor hitting this
// every minute would spend that budget for no extra signal.
export function GET() {
  return Response.json({ ok: true });
}
