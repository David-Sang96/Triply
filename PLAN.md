# Triply — Build Checklist (PLAN.md)

Living task tracker for the v1 build. Full rationale and architecture live in
[`_plans/triply-implementation-plan.md`](_plans/triply-implementation-plan.md).
Deployment and store submission live in [`docs/RELEASE.md`](docs/RELEASE.md).

**How to use:** mark a box `[x]` when a task is done **and verified**. `[ ]`
means "not proven", even if the code looks present — the difference matters, and
this file drifted badly once by ticking boxes on code that had never run.

**Legend:** `[ ]` todo · `[x]` done · `[~]` in progress · `[!]` blocked

**Progress:** Phase 0 ● · 1 ● · 2 ● · 3 ● · 4 ● · 5 ● · 6 ● · 7 ◐ · 8 ▢

> `●` = done · `◐` = partly done · `▢` = not started
>
> **3 Aug 2026:** the app was built, deployed and run end-to-end on a real
> Android device for the first time. Sign-up, trip generation with geocoded
> places and photos, the assistant, and custom cover upload all work in
> production. Phases 0–6 are closed. What remains is Phase 7 polish and Phase 8,
> the store submission.

---

## Phase 0 — Accounts & Keys (no code)

> These are the user's accounts (billing is theirs). All on free tiers, no card.

- [x] Create **Clerk** account → Publishable key, Secret key, Webhook signing secret
- [x] Create **Neon** account → `DATABASE_URL` (HTTP connection string)
- [x] Create **Google AI Studio** key → `GEMINI_API_KEY`
- [x] Create an image-search account → **Unsplash**, not Pexels
      *(`UNSPLASH_ACCESS_KEY`. Still on the **Demo** tier: 50 requests/hour.
      Production access must be applied for before a public launch.)*
- [x] Create **ImageKit** account → URL endpoint + public/private keys
      *(only `IMAGEKIT_PRIVATE_KEY` is read by code; the other two are unused.)*
- [x] Create **Inngest** account → `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`
- [x] Create **Sentry** account → DSN
- [x] Create **Expo / EAS** account *(`@david_sang/TRIPLY`)*
- [ ] Create **Google Cloud** project → OAuth client IDs for native Google sign-in
      *(Not needed: Google sign-in uses Clerk **browser SSO**, which only needs
      the provider enabled in the Clerk Dashboard.)*
- [x] Decide the geocoder `User-Agent` contact string
- [x] Set env strategy: client keys use `EXPO_PUBLIC_`; server keys are
      **sensitive**, never **secret**
      *(EAS Hosting cannot read `secret`-visibility variables — a deployment
      using one starts with no database. Verified 3 Aug: every server secret is
      masked, and the only plain-text values are public by design.)*

## Phase 1 — Backend Scaffold

- [x] Change `app.json` → `web.output` from `"static"` to `"server"`
- [x] Create `eas.json` (EAS Build + Hosting config)
- [ ] Create `src/app/api/health+api.ts` returning `{ ok: true }`
      *(never built, and no longer needed — the real routes are verified in
      production.)*
- [x] Run `npx expo export --platform web`
- [x] Run `eas deploy` → **`https://triply-app.expo.app`**
- [x] **Verify:** deployed routes respond *(clean 401 JSON on `/api/trips` and
      `/api/destinations` without a token; authenticated calls work from the app.)*

## Phase 2 — Database (Neon + Drizzle)

- [x] Install `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`
- [x] Create `src/server/db/index.ts` (neon-http client)
- [x] Create `drizzle.config.ts`
- [x] Create `src/server/db/schema.ts` — `users`, `trips`, `days`, `activities`,
      `chat_conversations`, `chat_messages`, `place_cache`, `destinations`
- [x] Run migrations against Neon *(versioned: `db:generate` → `db:migrate`.
      `db:push` is legacy — it wipes data.)*
- [x] **Verify:** 10 of 10 migrations applied, connection healthy
      *(`npm run db:check` — added 3 Aug, read-only.)*

## Phase 3 — Auth (Clerk — Google + Email)

**Client**

- [x] Pin `@clerk/expo` for Expo SDK 57 (`^3.7.8`)
- [x] Install `expo-secure-store`; `ClerkProvider` with token cache
- [x] Android development build
- [x] Google sign-in via browser SSO (`useSSO` → `oauth_google`) + `sso-callback`
- [x] **Verify:** Google sign-in works on a real device
- [x] Email/password sign-up with email-code verification
- [x] Email/password sign-in
- [x] Handle Clerk's **Client Trust** challenge — a device Clerk has not seen is
      untrusted for password sign-ins, and the sign-in screen now sends and
      verifies an emailed code (`needs_client_trust` → `prepareSecondFactor`)
- [x] Auth screens, shared `AuthField` / `SocialAuthButtons`, error boundaries
- [x] Route guards: `(auth)/_layout.tsx` and `src/app/index.tsx`
- [ ] Apple sign-in — placeholder only, needs an Apple Developer account

**Backend**

- [x] Install `@clerk/backend`
- [x] `src/app/api/webhooks/clerk+api.ts` — `verifyWebhook`, then enqueue an
      Inngest event for `user.created` / `updated` / `deleted`
- [x] Inngest user-sync jobs: `syncUserCreated`, `syncUserUpdated`, `syncUserDeleted`
- [x] **Verify:** a real sign-up writes to Neon in production
      *(Clerk → deployed webhook → Inngest Cloud → row inserted.)*
- [x] Protect the API routes *(`getUserId` in `src/server/auth.ts` verifies the
      bearer token with `verifyToken`; every route calls it. `authorizedParties`
      is applied only when the token carries an `azp` claim — native tokens do
      not, and passing it unconditionally rejects every request from the app.)*
- [x] Back-fill the `users` row on demand *(`src/server/users.ts` — the webhook
      is asynchronous, and `trips.user_id` is a NOT NULL foreign key to it.)*

## Phase 4 — Screens

- [x] `@tanstack/react-query` + Query provider
- [x] `apiFetch` helper injecting `Authorization: Bearer <token>` (`src/lib/api.ts`)
- [x] **Home** screen — hero carousel, trip cards, destinations, empty states
- [x] **Generate form** — destination, days, travellers, budget, interests, pace
- [x] **Trip detail** — photo carousel, map, days, activities, custom cover
- [x] **Loading** screen driven by generation status
- [x] Assistant, profile, destinations list and detail screens
- [x] **Verify:** every screen renders against real data on a device

## Phase 5 — Trip CRUD

- [x] `POST /trips` — 5-trip cap enforced in a single statement, so two
      concurrent requests cannot both pass the check
- [x] `GET /trips`, `GET /trips/:id`, `DELETE /trips/:id`, `GET /trips/:id/status`
- [x] `POST /trips/:id/cover` — custom cover upload, validated by magic-number
      check on the file's bytes rather than a client-supplied MIME type
- [x] **Verify:** full navigation loop works end-to-end in production
- [ ] **Verify:** the 6th trip is rejected with a friendly "limit reached"
      message *(code is in place; never exercised)*

## Phase 6 — Generation Pipeline (Inngest + AI)

- [x] Install `inngest`, `@google/genai`, `zod`
      *(`zod` was only declared as a direct dependency on 3 Aug — before that it
      resolved by accident through a Clerk transitive dependency.)*
- [x] `src/server/inngest/client.ts` — `isDev` decided by `NODE_ENV`, not by the
      `INNGEST_DEV` flag alone, which does reach deployments and silently
      pointed the client at localhost
- [x] `src/app/api/inngest+api.ts` (`inngest/edge` serve)
- [x] Sync the app URL in Inngest Cloud *(5 functions registered)*
- [x] `POST /trips` inserts `status='queued'` + sends `trip/requested`
- [x] Build `generateTrip`:
  - [x] set `status='generating'`
  - [x] Gemini structured JSON + Zod validation, days clamped ≤ 7
  - [x] Geocoding — cache lookup, 1 req/s throttle, contact `User-Agent`,
        sets lat/lng/`place_verified` *(Photon, not Nominatim)*
  - [x] Image search by destination *(Unsplash, with a fallback ladder: the
        phrase, the bare destination, then the broadest part of the name — a
        single query left trips with no cover at all)*
  - [x] persist days + activities in one `db.batch`, set `status='ready'`
  - [x] `onFailure`: `status='failed'` + friendly `error_message`
- [ ] Add a retry path for the Retry button *(re-send the event / reset to
      `queued`)*
- [x] **Verify (happy path):** form → poll → detail screen with geocoded places
      and a cover photo, in production
- [ ] **Verify (failure):** forced error → retries → `failed` → Retry works, and
      the failure is excluded from the cap
- [ ] **Verify (privacy):** the Gemini request payload carries no name, email or
      Clerk id

## Phase 7 — Monitoring & Polish

- [x] Install + configure **Sentry** — app crashes, `Sentry.wrap`, route-level
      error boundaries, `gen_ai.*` spans for the assistant
- [x] **Verify:** a triggered warning reaches Sentry with usable context
      *(the sign-in diagnostic did exactly this and identified
      `needs_client_trust`, which no amount of reading the code had.)*
- [ ] Capture API-route errors in Sentry *(routes currently `console.error`,
      which reaches the EAS Hosting log but not Sentry)*
- [ ] Add a manual Sentry capture on failed generations
- [ ] Tune the polling interval (3–5s) and hard-stop on a terminal status
- [x] **Unsplash** attribution in the UI *(photographer + Unsplash link per
        photo, and the download-tracking ping, as their terms require)*
- [ ] **OpenStreetMap / Photon** attribution in the UI
- [x] Review request usage in the EAS Hosting dashboard
- [ ] Apply for Unsplash **production** access (50 req/hour on Demo)

## Phase 8 — Release

See [`docs/RELEASE.md`](docs/RELEASE.md) for the full procedure.

- [x] `eas.json` build profiles; Android keystore generated and stored by EAS
- [x] Internal-distribution APK, installed and verified on a real device
- [x] Over-the-air updates *(`expo-updates`, fingerprint runtime policy, one
      channel per build profile)*
- [ ] **A support email that exists.** The app and legal site tell users to
      write to `support@triply.app` and `privacy@triply.app`; neither mailbox
      does. The privacy policy promises that address for deletion requests, so
      this is a broken promise to anyone who installs today, not only a Play
      requirement. 22 references across 8 files.
- [ ] Clerk **production** instance *(needs a domain; re-check that password
      sign-in is enabled, it is off in Clerk's defaults)*
- [ ] Replace the iOS icon *(`app.json` → `ios.icon` is still the Expo default)*
- [ ] Play Console account, store listing assets, data safety + content rating
- [ ] Closed test: 12 testers opted in for 14 continuous days
- [ ] Back up the Android keystore *(`eas credentials` — losing it means the app
      can never be updated on Play)*

---

## Cross-cutting reminders

- [x] Server dependencies are edge/web-standard (Cloudflare Workers, not Node)
      *(verified by the deployment running)*
- [x] Pin `@clerk/expo` (`^3.7.8`, Expo SDK 57)
- [x] Gemini output is `JSON.parse`d in a try/catch and Zod-validated
- [x] Custom trip cover columns migrated *(`customCoverImageUrl`,
      `useCustomCover` — 10/10 migrations applied)*
- [x] Geocoder usage within policy *(1 req/s throttle + cache table)*
- [ ] No test framework — `npx tsc --noEmit` and `npm run lint` are the only gate
- [ ] Cloudflare **subrequest limit** watch — every `neon-http` query counts as
      one. Seen once on 3 Aug with no failures; see "Known limits" in
      `docs/RELEASE.md`.
