# Triply — Agent Guide

Instructions for AI agents working in this repo. Everything here is a hard rule
unless it says "planned". This file is the shared source of truth; `CLAUDE.md`
imports it.

## Expo has changed — read the docs first

This project is pinned to **Expo SDK 57**. Expo's APIs changed a lot in recent
versions. Read the exact versioned docs at
<https://docs.expo.dev/versions/v57.0.0/> before writing any Expo code. Do not
rely on memory of older Expo or React Native patterns.

## Non-negotiable rules

- **NEVER run the app yourself — always, no exceptions.** The dev server is
  ALREADY running in a separate terminal that the developer controls. Do NOT
  start, restart, rebuild, or reload the app under any circumstances. This
  includes `npm run start` / `ios` / `android`, `expo start`, `expo run:*`,
  `eas build`, and any watch/bundler command. If you think the app needs to be
  (re)started, STOP and ask the developer to do it — never run it yourself.
- **The backend runs on Cloudflare Workers (V8), not Node.** API routes are
  Expo Router `*+api.ts` files in `src/app`, deployed to EAS Hosting. Server
  code must use web-standard APIs (`Request`, `Response`, `fetch`, `crypto`)
  and edge-compatible drivers only — no Node built-ins (`fs`, `process`, the
  `node:` modules).
- **Native tabs are mandatory — always, no exceptions.** All tab navigation in
  this project MUST use native tabs. NEVER use a JavaScript, custom, or
  JS-rendered tab bar (this includes `@react-navigation` JS tabs and any
  hand-built tab component). If a screen needs tabs, it uses native tabs. Check
  the SDK 57 docs (<https://docs.expo.dev/versions/v57.0.0/>) for the current
  native tabs API before building one.
- **Styling:** NativeWind v5 — use `className`, NOT `StyleSheet.create`.
- **React Compiler is ON** — do NOT add `useMemo` / `useCallback` / `React.memo`
  by hand unless profiling shows a real need.
- **Android native builds need JDK 17.** JDK 24/25 break the native CMake step
  (`react-native-worklets`, `react-native-screens`). JDK 17 is pinned in
  `android/gradle.properties` (`org.gradle.java.home`) — keep it. The machine
  default `java` can stay newer.

## Stack

**App**

- Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript (strict)
- Expo Router (file-based routing, typed routes ON)
- NativeWind v5 (preview) on Tailwind v4 (styling)

**Backend & services** — *planned unless marked installed. Do not substitute
other tools; rationale is in `_plans/triply-implementation-plan.md`.*

- **Database:** Postgres on [Neon](https://neon.tech) (`neon-http` driver) — **installed**
- **ORM:** [Drizzle](https://orm.drizzle.team) (`drizzle-orm` + `drizzle-kit`) — **installed**
- **Auth:** [Clerk](https://clerk.com) — Google + email (`@clerk/expo`, `@clerk/backend`) — **installed**
- **AI:** [Google Gemini](https://ai.google.dev) (`@google/genai`, structured JSON)
- **Place verification:** OpenStreetMap [Nominatim](https://nominatim.org) (geocoding)
- **Images:** [Pexels](https://pexels.com) (search) + [ImageKit](https://imagekit.io) (optimization/delivery)
- **Background jobs:** [Inngest](https://www.inngest.com) (`inngest/edge`) — **installed**
- **Monitoring:** [Sentry](https://sentry.io) — **installed**

Installed today: NativeWind, Sentry, Clerk, Neon + Drizzle, Inngest. Still
planned: Gemini, Nominatim, Pexels, ImageKit.

## Building a screen from a design (do this without being asked)

Designs live in `design/*.png`. Whenever the task is "build this screen/UI"
and a design image exists, **do not eyeball it — measure it, then verify the
result against it in a loop.** Run this workflow by default:

1. **Measure the design, don't guess.** Open the PNG with `jimp` (a
   devDependency) and pull real numbers: element bounding boxes, cap heights,
   gradient samples, the most-common ink colour of each text run. Treat the
   design's pixel canvas as the coordinate space and express every value as a
   fraction of it.
2. **Build it** with sizes scaled from screen **width** and vertical positions
   from screen **height**, so the composition survives other aspect ratios.
3. **Screenshot the running app and compare — repeat until the numbers agree.**
   ```powershell
   adb shell screencap -p /sdcard/shot.png     # run from PowerShell, not Git
   adb pull /sdcard/shot.png .\shot.png        # Bash rewrites /sdcard/ paths
   ```
   Measure the screenshot with the same script and diff it against the design.
   Iterate on the constants until every metric is within ~1%. Finish with a
   side-by-side image as a visual check.

Notes that will save time:

- **Never start, restart, or reload the app to do this** — see the
  non-negotiable rules. Metro fast refresh applies edits to the running app on
  its own. If a screen is only reachable transiently (a boot screen), gate it
  behind a temporary `const PREVIEW_X = true` in its parent, loop, then remove
  the flag.
- **Let fonts finish loading before trusting a screenshot.** A capture taken
  seconds after launch shows the Roboto fallback and will send you chasing a
  font bug that isn't there.
- **Compare text with a true pixel bbox, not a percentage-of-peak threshold** —
  a density cutoff biases heavier weights narrower. Use the *most common* ink
  colour for fills; the single darkest pixel is an anti-aliasing outlier.
- Check that a colour filter for one element can't also match another (a
  subtitle blue can easily fall inside a "title navy" test and silently
  swallow it).

## Project layout & conventions

- App code lives in **`src/app/`** — NOT the repo-root `app/`. Entry is
  `expo-router/entry`.
- Imports use the **`@/`** alias (`@/*` → `src/*`, `@/assets/*` → `assets/*`).
- **UI is native-first.** Prefer `@expo/ui`, `expo-symbols` (SF Symbols), and
  `expo-glass-effect` over hand-built views.
- **Images:** render with `expo-image`; serve through ImageKit for optimization.
- **Auth:** Clerk `@clerk/expo`; store tokens with an `expo-secure-store` token
  cache.
- **`@clerk/expo` is on v4 (`^4.3.0`) because v3 lost Google-SSO sessions.** On
  3.7.8 a Google session did not survive a restart on the production instance,
  while email/password on the same instance did. The token cache was *not* the
  cause — it returned the device token on every cold start (518 chars, 9–159ms,
  no clears, no failures). The cause is the native Clerk Android SDK that
  `@clerk/expo` autolinks (`expo.modules.clerk.ClerkExpoModule`): it keeps its
  **own** device token and syncs it into the JS token cache. Measured on the
  device, a Google sign-in wrote two different tokens 320ms apart and the last
  write won, leaving a token for a client the server reported as having **zero**
  sessions. Browser SSO diverges because the session is created through a
  browser; email/password stays inside the JS SDK. v4 fixes it directly —
  `isForeignSessionlessClient` in `nativeClientSync` now refuses to adopt a
  different client that has no sessions when the previous one did, and restores
  the previous device token.
- **Do not "fix" native-sync problems by excluding `@clerk/expo` from
  autolinking on v3.** It was tried (build `c3880a89`) and the app crashed on
  launch with `Cannot find native module 'ClerkExpo'`: on 3.7.8
  `dist/specs/NativeClerkModule.android.js` calls `requireNativeModule`, which
  throws from module scope, and Metro prefers that file over the `.js` one that
  correctly uses `requireOptionalNativeModule`. v4 made every spec optional, so
  the exclusion is *available* as a fallback — but v4's own fix should make it
  unnecessary. `ClerkProvider` has no prop to disable the sync either;
  `useNativeClientBootstrap` runs unconditionally.
- **Environment variables:** client keys use the **`EXPO_PUBLIC_`** prefix (they
  get bundled into the app, so never put a secret there). Server secrets have NO
  prefix and must stay server-side. See `.env.example`.
- Save new plan or spec docs under `_plans/`. `PLAN.md` (repo root) is the live
  phase-by-phase checklist.

## What may go into telemetry

Sentry spans, logs and breadcrumbs carry **ids, enum-like or fixed-category
values, booleans and counts** — never tokens, emails, request/response bodies,
or server- and exception-provided message text. Failures are reported as a
fixed `failure_kind` plus the numeric status, not the user-facing copy: that
text is display material and often echoes user input. `sendDefaultPii` is
deliberately `__DEV__`-only for the same reason.

**One deliberate exception: AI agent monitoring.** The `gen_ai.*` spans around
the assistant (`src/lib/chat.ts`) do record the user's message and the model's
reply, because Sentry's AI Conversations view is what makes a bad answer
debuggable and it is driven by exactly that content. This is scoped to chat
turns on those spans — it is not licence to log message text anywhere else. If
that trade stops being worth it, drop `gen_ai.input.messages` and
`gen_ai.output.messages`; every other attribute (model, token usage, latency)
keeps working without them.

## Commands

- `npm run start` — dev server (already running; do not start it).
- `npm run ios` / `npm run android` — native dev build (expo-dev-client). **Do
  not run these** — see the non-negotiable rules.
- `npm run lint` — expo lint.

**Backend / database — developer-run, do NOT run these yourself.** Like the app
dev server, these touch the developer's live services (Neon, ngrok, Clerk) or
run long-lived processes. If one is needed, STOP and ask the developer.

- **Schema changes use versioned migrations (not `db:push`).** Migrations
  *alter* tables, so existing data is preserved. Workflow: edit
  `src/server/db/schema.ts` → `npm run db:generate` (writes SQL to `drizzle/`)
  → `npm run db:migrate` (applies it to the dev branch) → verify → `npm run
  db:migrate:prod` (applies it to production).
- **Never edit a migration that may already have been applied.** Drizzle
  records a hash of each file, so changing one causes drift; fix it forward
  with a new migration instead.
- **A volatile `DEFAULT` rewrites the whole table.** `ADD COLUMN … DEFAULT
  gen_random_uuid() NOT NULL` can't use Postgres' catalog-only fast path, so it
  rewrites under `ACCESS EXCLUSIVE`. That is fine on today's small tables — and
  it is what correctly backfills a distinct value per row. On a large table,
  stage it instead: add nullable → backfill in batches → add a validated
  `CHECK (col IS NOT NULL)` → `SET NOT NULL` (which then reuses the check
  rather than re-scanning) → `SET DEFAULT`.
- **Two databases: one Neon project, two branches.** `.env` and `.env.local`
  hold the **`dev`** branch; `.env.production` holds **`production`**, which is
  what the deployed backend uses. Three commands have a `:prod` variant, and the
  dev one is always the default — the unsafe target has to be named:

  | dev (default) | production |
  | ------------- | ---------- |
  | `npm run db:migrate` | `npm run db:migrate:prod` |
  | `npm run db:check` | `npm run db:check:prod` |
  | `npm run db:studio` | `npm run db:studio:prod` |

  Migrate dev first, run `db:check` to confirm it worked, and only then run
  `db:migrate:prod`.

  `db:migrate` and `db:check` print which env file they loaded **and** the Neon
  endpoint id, because the file name alone can lie — a production string left in
  `.env` still prints `dev`. The endpoint differs per branch, so compare it with
  the Neon console when it matters.

  Every other `db:*` command — `db:generate`, `db:push`, `db:baseline`,
  `db:backfill-orphan-chats`, `db:seed-destinations` — reads `.env` only, prints
  no target line, and has no production path. `db:generate` connects to no
  database at all; it reads `schema.ts` and writes SQL.
- `npm run db:migrate` — apply pending migrations from `drizzle/` to the **dev**
  branch. `db:migrate:prod` writes to the live database.
- `npm run db:generate` — generate a versioned SQL migration from schema changes.
- `npm run db:baseline` — one-time: record existing migrations as already-applied
  (used when adopting migrations on a DB created earlier via `db:push`).
- `npm run db:push` — **legacy / throwaway resets only.** Recreates tables and
  **wipes data** on schema changes; do not use it for normal changes.
- `npm run db:studio` — open Drizzle Studio on the dev branch to browse/edit
  rows. `db:studio:prod` opens production.
- `npm run inngest:dev` — local Inngest dev server, pointed at
  `http://localhost:8081/api/inngest`. Long-running. (Edit the port in the
  script if the Expo dev server uses a different one.)
- `npm run tunnel` — expose the dev server via ngrok so Clerk can reach the
  webhook route. Long-running; needs ngrok installed on the machine.

Local backend dev flow: `db:migrate` to sync the schema, then run `inngest:dev`
and `tunnel` in separate terminals alongside the Expo dev server. The Clerk webhook
(`user.created`) → Inngest event (`clerk/user.created`) → `syncUserCreated`
inserts a row into the Neon `users` table.
