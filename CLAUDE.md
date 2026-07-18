# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read `AGENTS.md` first.** It is the source of truth for the stack, the
non-negotiable rules, project layout, environment conventions, and commands.
This file only adds context that is not there.

@AGENTS.md

## Project

**Triply** — an AI trip planner mobile app (iOS + Android). A signed-in user
describes a trip and AI generates a day-by-day itinerary with real, verified
places.

- **Architecture, data model, and build order:**
  `_plans/triply-implementation-plan.md` — read it before designing features.
- **Live task checklist (Phase 0–7):** `PLAN.md` at the repo root — check it to
  see what is done and what comes next.
- **Current state:** early. Only styling (NativeWind), monitoring (Sentry), and
  a native `android/` project are wired up. Product screens and the backend are
  not built yet.

## Dev target

- Primary dev/test target is **Android** — there is no Mac on this machine, so
  `npm run ios` cannot run here.
- Google OAuth (planned) needs a **development build**, not Expo Go.
- `app.json` → `web.output` is `"static"` today and must become `"server"`
  before any API route will work.
- No test framework is configured yet.

## Metro config note

`metro.config.js` order matters: `getSentryExpoConfig` (Sentry's drop-in for
`getDefaultConfig`) first, then `withNativewind(...)` wraps it. Changing the
order breaks source maps or styling. `global.css` is imported once in
`src/app/_layout.tsx`.
