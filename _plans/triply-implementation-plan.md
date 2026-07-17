# Triply — AI Trip Planner (v1 Implementation Plan)

## Context

We are building **Triply**, a mobile app (iOS + Android) where a signed-in user
describes a trip and AI generates a full day-by-day itinerary using real,
verified places. This solves the "blank page" problem of trip planning: instead
of researching for hours, a user answers a few questions and gets a usable plan
in under a minute.

The repo is a clean **Expo SDK 57** scaffold (starter files removed). This is a
solo, "production-shaped" build. The single quality bar we optimize for is
**itinerary quality** (realistic, well-sequenced, genuinely useful plans).

**Hard constraint discovered during planning:** the backend (Expo Router API
Routes) deploys to **EAS Hosting, which runs on Cloudflare Workers (V8 isolates),
not Node.js**. All server code must use web-standard APIs (`Request`, `Response`,
`fetch`, `crypto`). This dictates several library choices below. Source:
https://docs.expo.dev/eas/hosting/reference/worker-runtime/

**Cost constraint:** every service runs on its **free tier with no credit card**.
All 10 services were verified card-free (Gemini, Nominatim, Pexels, Clerk, Neon,
Inngest, Sentry, ImageKit, Expo EAS Build + Hosting). Two catches we design
around: (1) the **Gemini free tier trains on prompts** → never send personal
data to the model; (2) **Nominatim** allows ≤1 request/second, needs a custom
`User-Agent`, attribution, caching, and forbids autocomplete.

## Locked Decisions

| Area | Decision |
|---|---|
| Platform | iOS + Android. Android is the main dev/test device (no Mac). |
| Auth | Clerk, **Google Sign-In only** (Apple + email deferred to later). |
| Backend | Expo Router API Routes → **EAS Hosting (Cloudflare Workers)**. |
| Database | **Neon** (Postgres) via **Drizzle ORM + `neon-http` driver**. |
| Background jobs | **Inngest** (`inngest/edge` serve handler). |
| AI | **Google Gemini** (`@google/genai`, `gemini-2.5-flash`, structured JSON output). |
| Place verification | **OpenStreetMap Nominatim** (geocode names → coordinates). |
| Images | **Pexels** (chosen over Unsplash — ImageKit re-hosting breaks Unsplash's hotlinking rule) → optimized by **ImageKit**. |
| Monitoring | **Sentry** (app crashes + API route errors + failed generations). |
| Generation inputs | destination, #days (1–7), #travelers, **budget level** (Budget/Mid-range/Luxury), interests/style. |
| Trip actions | **view + delete only** (no edit/regenerate/favorite in v1). |
| Soft cap | **5 trips per user**; failed generations do **not** count. |
| Money | Free for users; no billing/Stripe. |
| Dates/currency | No calendar dates (Day 1…N); cost estimates in **USD**. |

**Out of scope for v1:** Apple Sign-In, email login, trip editing, regenerate/
variations, favorites, push notifications, billing, product analytics, staging env.

## Core Flow

Google sign-in → **Home** (past-trip cards + "Generate a trip" button; empty
state for new users) → **Generate form** → `POST /trips` (cap check + insert
`status='queued'` + `inngest.send`) → **Loading screen polls** `GET /trips/:id/status`
every 3s → on `ready` redirect to **Trip detail**; on `failed` show friendly
error + Retry. Failure auto-retries first (Inngest), and does not consume the cap.

## Data Model (Neon / Drizzle — `src/server/db/schema.ts`)

- **users** — mirror of Clerk user. `id` (text = Clerk id, PK), email, name,
  avatar_url, created_at. Populated by the Clerk `user.created` webhook.
- **trips** — id (uuid PK), user_id (FK), destination, num_days (1–7),
  num_travelers, budget_level, interests (text[]), title, summary,
  cover_image_url, **status** (`queued|generating|enriching|ready|failed`),
  error_message, **counts_against_cap** (bool), created_at, updated_at.
- **days** — id, trip_id (FK, cascade), day_number, theme_title,
  `UNIQUE(trip_id, day_number)`.
- **activities** — id, day_id (FK, cascade), time_of_day
  (`morning|afternoon|evening`), name, description, est_cost_usd, place_name,
  lat, lng, place_verified (bool), sort_order.
- **place_cache** — query (PK, normalized), lat, lng, display_name, raw (jsonb),
  fetched_at. Caches Nominatim results to respect its usage policy.

Cap check on `POST /trips`:
`count(trips WHERE user_id=? AND counts_against_cap=true AND status<>'failed') >= 5` → reject `409`.
Polling reads only `trips.status` (single source of truth).

## Architecture Details (version-verified)

**API routes** (`<name>+api.ts` in `src/app`, export `GET`/`POST`/etc.):
```
src/app/api/inngest+api.ts            # Inngest edge serve (GET/POST/PUT)
src/app/api/webhooks/clerk+api.ts     # user.created -> insert users row
src/app/trips+api.ts                  # GET list, POST create (cap + send event)
src/app/trips/[id]+api.ts             # GET one, DELETE one
src/app/trips/[id]/status+api.ts      # GET status (polling target)
```
Requires `app.json` → `web.output: "server"` (currently `"static"`).

**Auth:** `@clerk/expo` + `expo-secure-store` (token cache from
`@clerk/expo/token-cache`); wrap app in `ClerkProvider`. Server side: `@clerk/backend`
`authenticateRequest()` reads the user from a `Bearer <token>` header the client
attaches via `getToken()`. Webhook verified with `verifyWebhook` (svix) from
`@clerk/backend/webhooks`. Google OAuth needs a **dev build** (`expo run:android`),
not Expo Go. **Verify `@clerk/expo` lists SDK 57 support and pin the version.**

**Database:** `neon-http` driver only (no interactive transactions on Workers);
use `db.batch()` for days+activities inserts. Migrations via `drizzle-kit` from
the dev machine.

**Inngest:** device never calls Inngest directly — it calls our `POST /trips`,
which sends the `trip/requested` event. `inngest/edge` `serve()` maps 1:1 onto
the `+api.ts` route. Needs `INNGEST_EVENT_KEY` (send) + `INNGEST_SIGNING_KEY`
(serve). Sync the app URL in Inngest Cloud after each deploy.

**Generation job (`src/server/inngest/functions.ts`)** — one function, retried
per `step.run`:
1. Set `status='generating'`.
2. **Gemini** structured output (`responseMimeType:'application/json'` +
   `responseSchema`). Prompt contains **only** trip params — never name/email/id.
   `JSON.parse` inside try/catch, then validate with **Zod**; clamp days ≤ 7.
3. **Nominatim** enrichment: check `place_cache` first; on miss call with custom
   `User-Agent`, throttle ≤1 req/s (`step.sleep`), cache result, set lat/lng +
   `place_verified`. A place that fails to geocode stays unverified (do not fail
   the trip).
4. **Pexels** image search by destination/city name.
5. **ImageKit** URL transform (resize/crop the cover) → `cover_image_url`.
6. Persist days + activities; set `status='ready'`.
- **`onFailure`:** after retries exhaust, set `status='failed'`,
  `error_message` (friendly), `counts_against_cap=false`.

**Client state:** TanStack Query. Central `apiFetch` injects
`Authorization: Bearer ${await getToken()}`. Loading screen uses
`refetchInterval` that returns `false` on terminal status (protects the 100k
req/month free tier). Delete → mutation → invalidate `['trips']`.

## Critical Files

- `C:\Users\user\Desktop\TRIPLY\app.json` — set `web.output:"server"`; add Clerk/Sentry config.
- `C:\Users\user\Desktop\TRIPLY\src\app\_layout.tsx` — wrap in `ClerkProvider` + Query provider.
- `C:\Users\user\Desktop\TRIPLY\src\app\index.tsx` — Home (cards + empty state).
- `src/app/api/inngest+api.ts`, `src/app/api/webhooks/clerk+api.ts` — server endpoints (new).
- `src/app/trips+api.ts`, `src/app/trips/[id]+api.ts`, `src/app/trips/[id]/status+api.ts` — trip API (new).
- `src/server/db/schema.ts`, `src/server/db/index.ts` — Drizzle schema + client (new).
- `src/server/inngest/client.ts`, `src/server/inngest/functions.ts` — Inngest + pipeline (new).
- `eas.json` — EAS Build + Hosting config (new).

## Build Order (milestones)

0. **Accounts + keys** (no code): create all 8 service accounts, collect keys,
   Google Cloud OAuth client IDs, choose the Nominatim `User-Agent` string.
   Client keys use `EXPO_PUBLIC_` prefix; server keys marked **sensitive** (not
   "secret" — EAS Hosting won't deploy "secret"-typed vars) and deployed with
   `--environment`.
1. **Backend scaffold:** `web.output:"server"`, `eas.json`, a `health+api.ts`,
   `expo export` + `eas deploy`; confirm the health route responds. Proves the
   Workers pipeline before adding complexity.
2. **Database:** Drizzle + schema + migration; health route does `select 1`.
3. **Auth:** `@clerk/expo`, Android dev build, Google Sign-In, protect a route
   with `@clerk/backend`, Clerk webhook inserts a `users` row.
4. **Screens with mock data:** Home → Generate form → Trip detail → Loading.
5. **CRUD without AI:** `POST /trips` (cap + insert `status='ready'` hardcoded),
   `DELETE`, `GET status`; full navigation loop with fake generation.
6. **Generation pipeline (last):** Inngest serve route, sync in Inngest Cloud,
   switch `POST /trips` to `queued`+`send`, build `generateTrip` step by step
   (Gemini → Nominatim → Pexels → ImageKit → persist → onFailure). Test in the
   Inngest dev server locally first.
7. **Monitoring + polish:** Sentry (app + routes + failed-generation capture),
   tune polling, add OSM + Pexels attribution, review EAS usage dashboard.

## Verification

- **Auth:** sign in with Google on an Android dev build → a `users` row appears
  in Neon (webhook worked). Sign out / back in returns the same user.
- **Health/deploy:** `GET /api/health` on the `*.expo.app` URL returns `{ok:true}`.
- **Happy path:** submit the form → loading screen polls → redirect to a trip
  detail with overview, cover image, 1–7 days, activities with times/costs, and
  ≥1 place showing `place_verified=true` with coordinates. Inspect Neon rows.
- **Cap:** generate 5 successful trips → the 6th is rejected with a friendly
  "limit reached" message.
- **Failure:** force a Gemini/enrichment error → Inngest retries, then the trip
  ends `status='failed'`, the app shows the error + Retry, and the failure is
  **excluded** from the cap count (verify `counts_against_cap=false`).
- **Nominatim policy:** confirm requests send the custom `User-Agent`, repeated
  place lookups hit `place_cache` (no duplicate calls), and spacing is ≥1s.
- **Privacy:** inspect a Gemini request payload → no name/email/Clerk id present.
- **Monitoring:** trigger a handled error → it appears in Sentry.

## Open Risks

1. **Cloudflare Workers runtime** — any server dependency must be edge/web-standard;
   test libraries against the runtime early (Phase 1).
2. **`@clerk/expo` SDK 57 support** — one source listed SDK 53–55; confirm and pin.
3. **Gemini JSON reliability** — structured output is prompt-sensitive; always
   `JSON.parse` in try/catch + Zod validate + retry.
4. **Nominatim as a public service** — light-use only; if the app grows, self-host
   or move to a paid geocoder.
5. **Image quality** — Pexels stock photos are generic (of the city, not the exact
   place), a deliberate trade for a card-free stack.
6. **Free-tier ceilings** — polling frequency is the main request consumer; keep
   3–5s intervals and hard-stop on terminal status.
