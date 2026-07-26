# Sentry Logs — client-side structured logging

## Goal

Add Sentry's structured [Logs](https://docs.sentry.io/platforms/react-native/logs/)
feature so production issues (failed requests, failed trip generations, failed
sign-in) are visible in Sentry, not just silently dropped or left in device
console output.

## Scope: client-side only

`Sentry.init()` runs once, in `src/app/_layout.tsx` — the app entry point,
which executes on the **device**. Triply's backend (`src/app/api/**/+api.ts`,
`src/server/inngest/functions.ts`) runs in a separate Cloudflare Workers
process (deployed via EAS Hosting) that never calls `Sentry.init()`. A
`Sentry.logger` call placed there would not go anywhere.

Instrumenting the Workers side would need a second, separate Sentry SDK
(`@sentry/cloudflare`, not `@sentry/node` — Workers has no Node built-ins).
There is no `wrangler.toml` or exposed Workers entry point in this repo (EAS
Hosting manages that deployment), so there's no confirmed hook point to wire
`Sentry.wrapRequestHandler` into. That's a separate, riskier follow-up and is
explicitly **out of scope** for this change.

This change covers what the client already has full visibility into: every
network call, the trip-generation funnel (start → ready/failed), and
Google sign-in.

## Changes

### 1. Enable logs

`src/app/_layout.tsx` — add `enableLogs: true` to the existing `Sentry.init()`
call.

### 2. `src/lib/api.ts` — shared fetch wrapper (the chokepoint)

Every API call goes through `apiFetch`. Today, only 5xx responses are reported
(as an exception); 4xx responses (rate-limit hit, validation error, cap
reached) are silently dropped.

Add `Sentry.logger.warn("API request failed", { endpoint, method, status,
failure_kind })` for **every** non-2xx response, regardless of status.
`failure_kind` is a fixed category (`"network" | "invalid_response" |
"http_error"`), never the server-provided message text — that text is
user-facing display copy (`ApiError.message`), not a value approved for
telemetry. This is the single place that gives full visibility into failed
requests. Leave the existing `report()` (`Sentry.captureException` for 5xx)
as-is — logs and exceptions serve different purposes and this keeps the
exception-reporting bar unchanged.

### 3. `src/lib/trips.ts` — trip-generation funnel

The core product flow. Log both ends of it (a "wide event" per Sentry's best
practices), not just the start:

- `useCreateTrip` — on success, `Sentry.logger.info("Trip requested", { trip_id,
  has_destination, num_days, num_travelers, budget_tier, interest_count, pace
  })`. `has_destination` is a boolean, not the raw destination text the user
  typed. (Failure is already covered by change #2, since creation is an API
  call.)
- `useTripStatus` — when polling reaches a terminal status:
  - `ready` → `Sentry.logger.info("Trip generation succeeded", { trip_id })`
  - `failed` → `Sentry.logger.error("Trip generation failed", { trip_id,
    failure_kind })`. `failure_kind` is a fixed category
    (`"generation_failed"`), not the server's `errorMessage` — that's
    user-facing display copy (`friendlyError()` in
    `src/server/inngest/functions.ts`), and the server exposes no
    machine-readable error code to categorize the failure further. This is
    still the one place that surfaces *that* a generation failed, since the
    real stack trace stays server-side in Workers logs.

Guard so each terminal state logs once per status transition, not once per
poll tick (poll interval is 3s; a naive log-every-render would duplicate).

### 4. `src/lib/chat.ts` — `useSendChat`

Smaller scope than trips (chat isn't the core funnel), but same pattern:
- On success: `Sentry.logger.info("Chat message sent", { has_conversation_id:
  ... })`
- On error: `Sentry.logger.warn("Chat message failed", { has_conversation_id,
  status })`, using the `ApiError.status` (enum-like, already an approved
  field) rather than the raw error message (failure is also already covered
  by change #2 as an API call, so this is a supplementary business-level log,
  not the only signal.)

### 5. `src/components/SocialAuthButtons.tsx` — Google sign-in

`GoogleButton`'s catch block currently does
`console.error(JSON.stringify(err, null, 2))` on a failed SSO attempt — visible
nowhere in production. Swap it for `Sentry.logger.error("Google sign-in
failed", { error: String(err) })`. Keep the existing `Alert.alert` for the
user-facing message.

## Style

- No new logging helper/wrapper module. Call `Sentry.logger.info/warn/error`
  directly at each site — same pattern already used for
  `Sentry.captureException` elsewhere in this codebase (`src/lib/api.ts`,
  `src/app/(auth)/sign-in.tsx`, `src/app/(auth)/_layout.tsx`).
- Attribute names in `snake_case`, per the Sentry docs' recommendation.
- Never log tokens, emails, full request/response bodies, or server-/
  exception-provided message text — only ids, enum-like/fixed-category fields
  (status, budget tier, failure_kind), and counts. *(Later amended: the
  `gen_ai.*` AI-monitoring spans deliberately record chat message text. See
  "What may go into telemetry" in `AGENTS.md`, which is now the live rule —
  this doc is the historical design record.)*

## Out of scope (explicitly deferred)

- Server-side / Workers instrumentation (`@sentry/cloudflare` for the
  `+api.ts` routes and Inngest pipeline). Real root-cause errors for the AI
  generation pipeline (Gemini, geocoding, image search) will still only be
  visible in Workers' own logs, not Sentry, until this follow-up is done.
- `beforeSendLog` filtering, log-based alerting rules, and any Sentry
  dashboard configuration — this change only adds the log calls.
