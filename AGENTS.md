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

## Project layout & conventions

- App code lives in **`src/app/`** — NOT the repo-root `app/`. Entry is
  `expo-router/entry`.
- Imports use the **`@/`** alias (`@/*` → `src/*`, `@/assets/*` → `assets/*`).
- **UI is native-first.** Prefer `@expo/ui`, `expo-symbols` (SF Symbols), and
  `expo-glass-effect` over hand-built views.
- **Images:** render with `expo-image`; serve through ImageKit for optimization.
- **Auth:** Clerk `@clerk/expo`; store tokens with an `expo-secure-store` token
  cache.
- **Environment variables:** client keys use the **`EXPO_PUBLIC_`** prefix (they
  get bundled into the app, so never put a secret there). Server secrets have NO
  prefix and must stay server-side. See `.env.example`.
- Save new plan or spec docs under `_plans/`. `PLAN.md` (repo root) is the live
  phase-by-phase checklist.

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
  → `npm run db:migrate` (applies it to Neon).
- `npm run db:migrate` — apply pending migrations from `drizzle/` to Neon.
  **Writes to the live database.**
- `npm run db:generate` — generate a versioned SQL migration from schema changes.
- `npm run db:baseline` — one-time: record existing migrations as already-applied
  (used when adopting migrations on a DB created earlier via `db:push`).
- `npm run db:push` — **legacy / throwaway resets only.** Recreates tables and
  **wipes data** on schema changes; do not use it for normal changes.
- `npm run db:studio` — open Drizzle Studio to browse/edit DB rows.
- `npm run inngest:dev` — local Inngest dev server, pointed at
  `http://localhost:8081/api/inngest`. Long-running. (Edit the port in the
  script if the Expo dev server uses a different one.)
- `npm run tunnel` — expose the dev server via ngrok so Clerk can reach the
  webhook route. Long-running; needs ngrok installed on the machine.

Local backend dev flow: `db:migrate` to sync the schema, then run `inngest:dev`
and `tunnel` in separate terminals alongside the Expo dev server. The Clerk webhook
(`user.created`) → Inngest event (`clerk/user.created`) → `syncUserCreated`
inserts a row into the Neon `users` table.
