// Server-side error reporting to Sentry.
//
// Why this exists rather than an SDK: the backend runs on Cloudflare Workers
// (V8, not Node). `@sentry/react-native` is a client SDK and cannot execute
// there, and `@sentry/cloudflare` is built to wrap the Worker's own `fetch`
// handler — which we do not own, because EAS Hosting generates the entry point
// and we only export `GET`/`POST` from `*+api.ts` files. So until then, API
// routes and Inngest jobs only ever reached the EAS Hosting log, where nothing
// alerts and nobody looks. A trip generation could fail for every user for days
// and the first signal would be a complaint.
//
// This sends a Sentry envelope with plain `fetch`: web-standard APIs only, no
// dependency, no Node built-ins, so it satisfies the edge rule in AGENTS.md.
// Format per https://develop.sentry.dev/sdk/data-model/envelopes/ and
// .../foundations/transport/authentication.md.
//
// What it deliberately does NOT do: parse stack frames into Sentry's structured
// format. Without uploaded server source maps those frames point at bundled,
// minified output and are worth little, so the raw stack goes in `extra` where
// it is at least readable. If server source maps get uploaded later, frame
// parsing becomes worth adding.
//
// Telemetry policy (AGENTS.md): `tags` carry ids, enum-like values, booleans and
// counts only. Never tokens, emails or request/response bodies. The exception's
// own type, message and stack DO go up — same as `Sentry.captureException` on
// the client (src/lib/api.ts) — because that is the thing being reported.
// Callers must not pass user input as a tag.

const SENTRY_CLIENT = "triply-server/1.0.0";

// How long to wait for the ingest request. Telemetry must never delay a
// response or an Inngest step for long, and a dropped report is much cheaper
// than a slow API. Cloudflare cancels pending work once a response is returned,
// so this is awaited rather than fire-and-forget.
const SEND_TIMEOUT_MS = 2000;

type ParsedDsn = {
  envelopeUrl: string;
  publicKey: string;
};

// DSN shape: https://<publicKey>@<host>/<projectId>, optionally with a path
// prefix for self-hosted installs. Returns null rather than throwing: a broken
// or absent DSN must disable reporting, never break a request.
function parseDsn(dsn: string | undefined): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    // The project id is the last path segment; anything before it is a prefix.
    const segments = url.pathname.split("/").filter(Boolean);
    const projectId = segments.pop();
    if (!publicKey || !projectId) return null;

    const prefix = segments.length > 0 ? `/${segments.join("/")}` : "";
    return {
      envelopeUrl: `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`,
      publicKey,
    };
  } catch {
    return null;
  }
}

// Parsed once. `EXPO_PUBLIC_SENTRY_DSN` is the same DSN the app uses — a DSN is
// public by design (it only permits writes), which is why no new server secret
// is needed.
const dsn = parseDsn(process.env.EXPO_PUBLIC_SENTRY_DSN);

let warnedAboutMissingDsn = false;

// Sentry wants 32 hex characters with no dashes.
function eventId() {
  return crypto.randomUUID().replace(/-/g, "");
}

export type ServerErrorContext = {
  /** Fixed category, not user-facing copy. e.g. "trip_generation_failed". */
  failure_kind: string;
  /** Route or job that failed, e.g. "POST /api/trips" or "generateTrip". */
  route: string;
  /** HTTP status being returned, when there is one. */
  status?: number;
  /**
   * Extra tags. Ids, enum-like values, booleans and counts ONLY — never tokens,
   * emails or request bodies. Values are stringified; null and undefined are
   * dropped so a missing id does not become the string "undefined".
   */
  tags?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Report a server-side error to Sentry. Never throws, never rejects — a
 * telemetry failure must not turn a handled error into an unhandled one.
 */
export async function captureServerError(
  error: unknown,
  context: ServerErrorContext,
): Promise<void> {
  if (!dsn) {
    // Say this once. Repeating it per request would bury the actual errors in
    // the log, which is the very problem this file exists to fix.
    if (!warnedAboutMissingDsn) {
      warnedAboutMissingDsn = true;
      console.error(
        "captureServerError: EXPO_PUBLIC_SENTRY_DSN is not set or unparseable — " +
          "server errors are going to the log only",
      );
    }
    return;
  }

  try {
    const err = error instanceof Error ? error : undefined;
    const id = eventId();
    const sentAt = new Date().toISOString();

    const tags: Record<string, string> = {
      failure_kind: context.failure_kind,
      route: context.route,
      runtime: "cloudflare-workers",
    };
    if (context.status !== undefined) tags.status = String(context.status);
    for (const [key, value] of Object.entries(context.tags ?? {})) {
      if (value !== null && value !== undefined) tags[key] = String(value);
    }

    const event = {
      event_id: id,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      logger: "server",
      // Groups events in Sentry by the failing route or job.
      transaction: context.route,
      environment: process.env.NODE_ENV ?? "development",
      tags,
      exception: {
        values: [
          {
            type: err?.name ?? "UnknownError",
            // A thrown non-Error still needs something readable. String() on an
            // object gives "[object Object]", which is useless but honest — and
            // better than JSON.stringify, which throws on circular values.
            value: err?.message ?? String(error),
          },
        ],
      },
      extra: err?.stack ? { stack: err.stack } : undefined,
    };

    const body =
      JSON.stringify({ event_id: id, sent_at: sentAt }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event);

    // AbortController rather than AbortSignal.timeout for the widest runtime
    // support; both exist on Workers, but this one has existed for longer.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const response = await fetch(dsn.envelopeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-sentry-envelope",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=${SENTRY_CLIENT}, sentry_key=${dsn.publicKey}`,
        },
        body,
        signal: controller.signal,
      });
      // A rejected envelope is silent otherwise, and a silently broken error
      // reporter is worse than none: it looks like there are no errors.
      if (!response.ok) {
        console.error(
          `captureServerError: Sentry rejected the envelope (${response.status})`,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (sendErr) {
    console.error("captureServerError: failed to report to Sentry:", sendErr);
  }
}

const reportedOnce = new Set<string>();

/**
 * Like `captureServerError`, but reports a given `key` at most once per isolate.
 *
 * For failures that repeat on every single request — a missing environment
 * variable makes *all* of them fail — where one report says everything and
 * thousands say the same thing while burning the Sentry quota.
 *
 * Per-isolate rather than global is the right scope: Workers isolates are
 * recycled, so a still-broken deployment reports again periodically instead of
 * going silent forever, and a fresh deploy always reports at least once.
 */
export async function captureServerErrorOnce(
  key: string,
  error: unknown,
  context: ServerErrorContext,
): Promise<void> {
  if (reportedOnce.has(key)) return;
  reportedOnce.add(key);
  await captureServerError(error, context);
}
