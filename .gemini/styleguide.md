# Triply review guide

An Expo SDK 57 / React Native app with its backend in the same repo as Expo
Router API routes, deployed to Cloudflare Workers via EAS Hosting.

`AGENTS.md` at the repo root is the full source of truth. This file is the
subset that matters when reviewing a diff.

## Hard rules — flag any violation

- **Cloudflare Workers, not Node.** Server code (`src/app/**/*+api.ts`,
  `src/server/**`) must use web-standard APIs only: `Request`, `Response`,
  `fetch`, `crypto`. No `fs`, `path`, `process` beyond `process.env`, and no
  `node:` imports. These fail at deploy, not at build.
- **Native tabs only.** Tab navigation uses `NativeTabs` from
  `expo-router/unstable-native-tabs`. A JS or hand-built tab bar, including
  `@react-navigation` JS tabs, is never acceptable.
- **NativeWind, not StyleSheet.** Style with `className`. `StyleSheet.create`
  should not appear. Inline `style` is fine for the few cases where a utility
  does not work — those have comments explaining why.
- **React Compiler is on.** Do not accept new `useMemo`, `useCallback` or
  `React.memo` unless the diff explains a measured problem.
- **Client secrets.** Anything prefixed `EXPO_PUBLIC_` is compiled into the app
  binary and is public. A secret behind that prefix is a serious finding.
  Server secrets have no prefix.
- **Imports** use the `@/` alias (`@/*` → `src/*`), not deep relative paths.
- **Migrations are append-only.** A change to an existing file under `drizzle/`
  is a bug — Drizzle records a hash of each one. Fix forward with a new
  migration.

## Telemetry policy

Sentry spans, logs and breadcrumbs may carry ids, enum-like values, booleans
and counts. They must never carry tokens, emails, request or response bodies,
or message text that came from a server or an exception. Failures report a
fixed `failure_kind` plus a numeric status, never the user-facing copy.

One deliberate exception: the `gen_ai.*` spans in `src/lib/chat.ts` do record
the user's message and the model's reply, because Sentry's AI Conversations
view depends on it. Do not extend that to anywhere else.

## Things that have actually broken here

Weight these higher than generic advice — each one shipped a bug.

- **Never trust client-supplied file metadata.** React Native attaches no MIME
  type to a Blob read from a `file://` URI, and whether a filename survives
  `FormData` is a platform detail. Validate uploads by their bytes.
- **Every `neon-http` query is a Cloudflare subrequest**, not just `fetch`
  calls, and an invocation has a cap. A loop of queries inside one request or
  one `step.run` is a real risk. Prefer `db.batch([...])`.
- **The `neon-http` driver has no interactive transactions.** Multi-statement
  atomicity must be a single SQL statement or `db.batch`.
- **Unhandled writes become blank 500s.** A route that writes without a
  try/catch turns a constraint violation into a 500 with no body. Foreign keys
  to `users.id` are the common case, because that row arrives asynchronously
  from a Clerk webhook.
- **`contentContainerStyle` replaces `contentContainerClassName`** on
  ScrollView rather than merging with it — an inline style there silently drops
  the compiled className.
- **`className="flex-1"` has collapsed full-screen containers to zero height**
  in this project. Inline `style={{ flex: 1 }}` is deliberate where it appears.
- **Config that only runs in production is untested by definition.** Code
  gated on `NODE_ENV === "production"`, or on an env var that is blank locally,
  has never executed when the PR is opened. Say so.

## Tone

Comment on correctness, security and things that will fail in production.
Formatting and naming are handled by eslint and a strict `tsc`; do not spend
comments on them. If the diff looks right, say so briefly rather than finding
something to say.
