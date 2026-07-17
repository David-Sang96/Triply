# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Non-negotiable: Expo SDK 57

This project is pinned to **Expo SDK 57** (see `AGENTS.md`). Expo's APIs changed
significantly in recent versions. **Read the exact versioned docs at
https://docs.expo.dev/versions/v57.0.0/ before writing any Expo code** — do not
rely on memory of older Expo/React Native patterns.

## Project

**Triply** — an AI trip planner mobile app (iOS + Android). A signed-in user
describes a trip and AI generates a day-by-day itinerary with real, verified
places. The repo is currently a near-empty Expo scaffold; the **full planned
architecture, stack, data model, and build order live in
`_plans/triply-implementation-plan.md`** — read it before designing features.
Save any new plan/spec docs under `_plans/`.

## Commands

```bash
npm start            # expo start (dev server; pick a target from the prompt)
npm run android      # expo start --android
npm run ios          # expo start --ios (needs macOS; not this dev's machine)
npm run web          # expo start --web
npm run lint         # expo lint
```

- No test framework is configured yet.
- Google OAuth (planned) requires a **development build**, not Expo Go —
  primary dev/test target is **Android** (no Mac available).

## Architecture & conventions

- **Routing:** Expo Router with file-based routing. The app directory is
  **`src/app/`** (not the repo-root `app/`); entry is `expo-router/entry`.
- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- **`example/` is reference only** — it holds the original Expo starter template
  (themed components, hooks, tabs). It is **not** part of the app; do not import
  from it, edit it, or ship it. Use it only to see how SDK 57 patterns look.
- **React Compiler is ON** (`app.json` → `experiments.reactCompiler`). Avoid
  hand-written `useMemo`/`useCallback` unless profiling shows a real need.
- **Typed routes are ON** (`experiments.typedRoutes`) — navigation paths are
  type-checked; keep route strings valid.
- **Backend = Expo Router API Routes** (`*+api.ts` files in `src/app`), deployed
  to **EAS Hosting, which runs on Cloudflare Workers (V8), not Node.js**. All
  server code must use web-standard APIs (`Request`, `Response`, `fetch`,
  `crypto`) and edge-compatible drivers. See the plan for details.
- **`app.json` → `web.output` is currently `"static"`** and must become
  `"server"` before any API route will work.

## Planned stack (not yet installed — do not substitute)

Clerk (Google sign-in) · Neon + Drizzle (`neon-http` driver) · Inngest
(`inngest/edge`) · Google Gemini (`@google/genai`, structured JSON) · OSM
Nominatim (geocoding) · Pexels + ImageKit (images) · Sentry (monitoring).
Rationale for each choice is in `_plans/triply-implementation-plan.md`.
