# Triply — Build Checklist (PLAN.md)

Living task tracker for the v1 build. Full rationale and architecture live in
[`_plans/triply-implementation-plan.md`](_plans/triply-implementation-plan.md).

**How to use:** mark a box `[x]` when a task is done and verified. Work phases
in order — each phase depends on the ones before it.

**Legend:** `[ ]` todo · `[x]` done · `[~]` in progress · `[!]` blocked

**Progress:** Phase 0 ◐ · 1 ◐ · 2 ◐ · 3 ◐ · 4 ▢ · 5 ▢ · 6 ◐ · 7 ◐

> `◐` = partly done. Auth is now wired end-to-end for the user lifecycle: the
> Clerk webhook + Inngest jobs sync user **created / updated / deleted** into the
> Neon `users` table (see `_plans/auth-to-neon-flow.md`). The database client and
> the Inngest serve route were built as part of this, which is why Phases 1, 2,
> and 6 are partly done. Still open in Phase 3: protecting the trip API routes
> with `authenticateRequest()`.

---

## Phase 0 — Accounts & Keys (no code)

> These are the user's accounts (billing is theirs). All on free tiers, no card.

- [x] Create **Clerk** account → get Publishable key, Secret key, Webhook signing secret
      *(Publishable key is wired via `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; Secret
      key + Webhook secret not needed until the backend exists — Phase 1/3.)*
- [x] Create **Neon** account → get `DATABASE_URL` (HTTP connection string)
      *(wired in `.env`; verified working — the user-sync insert writes rows.)*
- [ ] Create **Google AI Studio** key → `GEMINI_API_KEY`
- [ ] Create **Pexels** account → `PEXELS_API_KEY`
- [ ] Create **ImageKit** account → URL endpoint + public/private keys
- [ ] Create **Inngest** account → `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`
- [x] Create **Sentry** account → DSN
      *(DSN wired via `EXPO_PUBLIC_SENTRY_DSN`; Sentry installed and initialized
      in `src/app/_layout.tsx`.)*
- [ ] Create **Expo / EAS** account
- [ ] Create **Google Cloud** project → OAuth 2.0 client IDs (Android, iOS, Web) for Clerk Google sign-in
      *(Not needed for the current approach: Google sign-in uses Clerk **browser
      SSO**, which only needs the provider enabled in the Clerk Dashboard. Revisit
      only if native Google sign-in is wanted later.)*
- [ ] Decide the **Nominatim `User-Agent`** contact string (e.g. `Triply/1.0 (email)`)
- [ ] Set env strategy: client keys use `EXPO_PUBLIC_` prefix; server keys marked **sensitive** (not "secret") in EAS

## Phase 1 — Backend Scaffold

- [x] Change `app.json` → `web.output` from `"static"` to `"server"`
- [ ] Create `eas.json` (EAS Build + Hosting config)
- [ ] Create `src/app/api/health+api.ts` returning `{ ok: true }`
- [ ] Run `npx expo export --platform web`
- [ ] Run `npx eas deploy` (get the `*.expo.app` URL)
- [ ] **Verify:** `GET /api/health` responds on the deployed URL

## Phase 2 — Database (Neon + Drizzle)

- [x] Install `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`
- [x] Create `src/server/db/index.ts` (neon-http client)
- [x] Create `drizzle.config.ts` (drizzle-kit, loads `DATABASE_URL` via dotenv)
- [~] Create `src/server/db/schema.ts`:
  - [x] `users` table (`id`, `email`, `name`, `image_url`, `created_at`, `updated_at`)
  - [ ] `trips` table (incl. `status`, `counts_against_cap`, `error_message`)
  - [ ] `days` table (unique `trip_id, day_number`)
  - [ ] `activities` table (place fields + `place_verified`)
  - [ ] `place_cache` table (Nominatim cache)
- [x] Run `drizzle-kit` migration against Neon *(via `npm run db:push`; `users` table created)*
- [x] **Verify:** neon-http write works *(the user-sync Inngest job inserts a row —
      done in place of a `select 1` health route, which does not exist yet)*

## Phase 3 — Auth (Clerk — Google + Email)

> Scope grew beyond "Google only": email/password sign-up (with email-code
> verification) and sign-in are now built too. Client-side auth is done; the
> backend items below wait on Phase 1 (no server exists yet).

**Client (done)**

- [x] Confirm `@clerk/expo` supports **Expo SDK 57**, then install + pin it (`@clerk/expo` ^3.7.8)
- [x] Install `expo-secure-store`
- [x] Wrap app in `ClerkProvider` (token cache) in `src/app/_layout.tsx`
- [x] Create an **Android development build** (`npx expo run:android`)
- [x] Enable **Google** in Clerk Dashboard → Social connections; sign in via
      **browser SSO** (`useSSO` → `oauth_google`) with the `sso-callback`
      deep-link route (`src/components/SocialAuthButtons.tsx`,
      `src/app/sso-callback.tsx`)
- [x] **Verify:** Google sign-in works on the Android dev build
- [x] Build **email/password sign-up** with email-code verification (`src/app/(auth)/sign-up.tsx`)
- [x] Build **email/password sign-in** (`src/app/(auth)/sign-in.tsx`)
- [x] Build auth screens — welcome, sign-in, sign-up, verify — plus shared
      `AuthField` and `SocialAuthButtons` components, with field validation and
      an error boundary that hides details in release builds
- [x] Guard routes: `(auth)/_layout.tsx` redirects signed-in users to `/`;
      `src/app/index.tsx` redirects signed-out users to `/welcome`
- [ ] Apple sign-in — placeholder only (needs an Apple Developer account); intentionally deferred

**Backend**

- [x] Install `@clerk/backend`
- [x] Create `src/app/api/webhooks/clerk+api.ts` — verify with `verifyWebhook`
      (svix), then enqueue an Inngest event for **`user.created` / `user.updated`
      / `user.deleted`**
- [x] Build the Inngest user-sync jobs (`src/server/inngest/functions.ts`):
  - [x] `syncUserCreated` — insert (idempotent, `onConflictDoNothing`)
  - [x] `syncUserUpdated` — upsert the latest email/name/image, bump `updated_at`
  - [x] `syncUserDeleted` — delete the row
- [x] **Verify:** the user-sync pipeline writes to Neon *(confirmed via an Inngest
      test event; ngrok + Clerk webhook wired for real sign-ups)*
- [ ] Protect the trip API routes with `authenticateRequest()` *(deferred to
      Phase 5, when the trip routes exist)*

## Phase 4 — Screens with Mock Data

- [ ] Install `@tanstack/react-query`; add Query provider to `_layout.tsx`
- [ ] Create `apiFetch` helper that injects `Authorization: Bearer <token>`
- [ ] Build **Home** screen (past-trip cards + empty state + "Generate a trip" button)
- [ ] Build **Generate form** (destination, #days 1–7, #travelers, budget level, interests)
- [ ] Build **Trip detail** screen (overview, cover, days, activities)
- [ ] Build **Loading** screen
- [ ] **Verify:** screens render against seeded/mock data

## Phase 5 — CRUD Without AI

- [ ] `POST /trips` — cap check (max 5) + insert `status='ready'` with hardcoded content
- [ ] `GET /trips` — list current user's trips
- [ ] `GET /trips/:id` — full trip (days + activities)
- [ ] `DELETE /trips/:id`
- [ ] `GET /trips/:id/status` — polling target
- [ ] **Verify:** full navigation loop works end-to-end with fake generation
- [ ] **Verify:** 6th trip is rejected with a friendly "limit reached" message

## Phase 6 — Generation Pipeline (Inngest + AI)

- [x] Install `inngest` *(done for user-sync; `@google/genai` + `zod` still pending)*
- [ ] Install `@google/genai`, `zod`
- [x] Create `src/server/inngest/client.ts` *(dev mode via `INNGEST_DEV=1`)*
- [x] Create `src/app/api/inngest+api.ts` (`inngest/edge` serve; GET/POST/PUT)
- [ ] Sync the app URL in Inngest Cloud *(prod only; dev syncs to the local Inngest dev server)*
- [ ] Switch `POST /trips` to insert `status='queued'` + `inngest.send('trip/requested')`
- [ ] Build `generateTrip` in `src/server/inngest/functions.ts`:
  - [ ] Step: set `status='generating'`
  - [ ] Step: Gemini structured JSON output (no personal data in prompt) + Zod validation + clamp days ≤ 7
  - [ ] Step: Nominatim enrichment — cache lookup, ≤1 req/s throttle, custom `User-Agent`, set lat/lng/`place_verified`
  - [ ] Step: Pexels image search by destination/city
  - [ ] Step: ImageKit URL transform → `cover_image_url`
  - [ ] Step: persist days + activities, set `status='ready'`
  - [ ] `onFailure`: set `status='failed'`, friendly `error_message`, `counts_against_cap=false`
- [ ] Add retry path (re-send event / reset to `queued`) for the Retry button
- [ ] **Verify (happy path):** submit form → poll → redirect to detail with verified places
- [ ] **Verify (failure):** forced error → retries → `status='failed'` → error + Retry, and failure excluded from cap
- [ ] **Verify (privacy):** Gemini request payload contains no name/email/Clerk id

## Phase 7 — Monitoring & Polish

- [~] Install + configure **Sentry** (app crashes + API route errors)
      *(installed; `Sentry.init` + `Sentry.wrap` in `_layout.tsx`, and auth
      screens report errors via an ErrorBoundary → Sentry. **App-crash reporting
      done**; API-route error capture not wired yet.)*
- [ ] Add a manual Sentry capture on failed generations
- [ ] Tune polling interval (3–5s) and hard-stop on terminal status
- [ ] Add **OpenStreetMap** + **Pexels** attribution in the UI
- [ ] Review request / CPU usage in the EAS Hosting dashboard
- [ ] **Verify:** a triggered error appears in Sentry

---

## Cross-cutting reminders (from the plan's Open Risks)

- [ ] Confirm every server dependency is edge/web-standard (Cloudflare Workers, not Node)
- [x] Pin the confirmed `@clerk/expo` version (`^3.7.8`, Expo SDK 57)
- [ ] Always `JSON.parse` Gemini output in try/catch + Zod validate
- [ ] Keep Nominatim usage within policy (light use only)
