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
- [x] Create **Google Cloud** project → OAuth client ID — **done; confirmed 16
      Aug** by checking Clerk → SSO Connections → Google, which shows this
      project's own Client ID rather than "Setup required". Project `Triply`
      (`triply-504414`), redirect URI
      `https://clerk.triply.davidsang.dev/v1/oauth_callback`.
      *Not needed in development — Clerk supplies shared credentials there. But a
      production instance requires your own, browser SSO or not, and on shared
      credentials users would see a consent screen naming Clerk rather than
      Triply.*
- [x] Decide the geocoder `User-Agent` contact string
- [x] Set env strategy: client keys use `EXPO_PUBLIC_`; server keys are
      **sensitive**, never **secret**
      *(EAS Hosting cannot read `secret`-visibility variables — a deployment
      using one starts with no database. Verified 3 Aug: every server secret is
      masked, and the only plain-text values are public by design.)*

## Phase 1 — Backend Scaffold

- [x] Change `app.json` → `web.output` from `"static"` to `"server"`
- [x] Create `eas.json` (EAS Build + Hosting config)
- [x] Create `src/app/api/health+api.ts` returning `{ ok: true }` — **deployed
      and verified in production, 22 Aug.**
      `curl https://triply-app.expo.app/api/health` → `{"ok":true}`, HTTP 200,
      `application/json`.
      Deliberately touches no database and needs no auth, so a red health check
      means the deploy is down rather than a dependency — `/api/trips` (a clean
      401 when signed out) is what proves the auth path. Keeping it free of DB
      calls also keeps an every-minute uptime monitor off the Cloudflare
      subrequest budget.
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

- [x] Pin `@clerk/expo` for Expo SDK 57 (`^4.3.0` — moved off 3.7.8 on 15 Aug
      because v3's native client sync lost Google-SSO sessions across restarts;
      v4 supports `expo >=54 <58`. See AGENTS.md.)
- [x] Install `expo-secure-store`; `ClerkProvider` with token cache
- [x] Android development build
- [x] Google sign-in via browser SSO (`useSSO` → `oauth_google`) + `sso-callback`
- [x] **Verify:** Google sign-in works on a real device
- [x] **Verify:** a Google session survives a full restart — 10 of 10
      swipe-away-from-Recents cycles on the phone against the **production**
      instance (16 Aug). It did not before: v3's native client sync replaced the
      device token with one whose client had no sessions, so every restart
      signed the user out while email/password survived. Needed `@clerk/expo`
      v4; the token cache was never the cause. Full diagnosis in AGENTS.md.
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
- [~] Add a retry path for the Retry button — **server side deployed and live 22
      Aug; the round trip is still untested.** `POST /api/trips/:id/retry`
      answers `401 application/json` without a token, which is the proof the
      route is really deployed: an *undeployed* route returns `404 text/html`,
      because the request falls through to the single-page app.
      **The app side has not shipped.** The button that calls this route reaches
      installed builds only via `eas update`; until then the server route exists
      and nothing calls it.
      `POST /api/trips/:id/retry` (`src/app/api/trips/[id]/retry+api.ts`) resets
      the row to `queued`, clears `error_message`, and re-sends `trip/requested`
      with the parameters already stored on the trip. The screen no longer
      navigates: `useRetryTrip` invalidates the status query, which restarts the
      3s poll, and the loading steps take over in place.
      Before this, Retry called `router.replace("/generate")` — a *different*
      trip, with the destination and interests typed again, and the dead row
      left in the list.
      Three things that are easy to get wrong here, all handled:
      - **The cap.** A failed trip has `counts_against_cap = false`. Setting it
        back to `true` on retry is what lets a user at 5 good trips + 1 failed
        one reach 6, so the flag is restored inside the same guarded `UPDATE`
        that re-counts the cap — the same single-statement trick `POST /trips`
        uses, because `neon-http` has no interactive transactions.
      - **Stale days.** `finalize` inserts days with a unique constraint on
        `(trip_id, day_number)`. Any leftover row would make every future retry
        fail on the constraint instead of on the real problem, so days are
        deleted first (activities cascade).
      - **Sentry.** `useTripStatus` logged a terminal status once per trip id.
        A retry that also failed was therefore invisible — the exact case worth
        seeing. The guard now clears when the status goes back to live.
      **To verify:** force a failure with the invalid-UUID trick in Phase 7,
      then tap Retry and watch the same trip id go `queued → … → ready`.
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
- [x] Capture API-route errors in Sentry — **verified in production, 16 Aug.**
      `curl -X POST https://triply-app.expo.app/api/webhooks/clerk -d '{}'`
      produced a Sentry issue within a minute: *"@clerk/backend: Missing required
      webhook headers: svix-id, svix-timestamp, svix-signature"*, tagged
      `failure_kind: webhook_verification_failed`, `route: POST
      /api/webhooks/clerk`, `runtime: cloudflare-workers`, `status: 400`, and
      found by a tag search. So the hand-written envelope is accepted, the tags
      are indexed, and events group as real issues. A bad signature changes no
      data, which makes that curl a safe smoke test to repeat after any change to
      `src/server/sentry.ts`.
      *Proven for the transport, which was the risk. The other 18 call sites use
      the same helper; only this one has actually been fired.*
      *Implementation:* `src/server/sentry.ts` POSTs a Sentry envelope with plain
      `fetch`, because no Sentry SDK runs on Cloudflare Workers
      (`@sentry/react-native` is a client SDK; `@sentry/cloudflare` wraps a
      Worker `fetch` handler that EAS Hosting owns). Wired into 19 failure sites
      across the API routes, `auth.ts`, `users.ts`, `images.ts` and the Inngest
      jobs — every server `console.error` except two, and those two omissions are
      deliberate and commented: token verification failures and geocode misses
      are routine traffic, and an alert that fires constantly is one nobody
      reads. No `console.error` was removed; the reports are additional.
- [x] Add a manual Sentry capture on failed generations — **verified in
      production, 17 Aug.** `generateTrip`'s `onFailure` reports before marking
      the trip failed, and the Sentry issue arrived tagged
      `failure_kind: trip_generation_failed`, `route: generateTrip`, found by tag
      search. The title carried the real root cause — the Postgres rejection of
      the bad id, passed straight through from the original failure rather than a
      wrapper.
      **How it was forced, without spending anything:** send a `trip/requested`
      event whose `tripId` is not a UUID. Postgres rejects it in the first step,
      Inngest retries twice, and `onFailure` runs — no Gemini call, no Unsplash
      requests, no env changes and no redeploy:

      ```bash
      KEY=$(grep -m1 '^INNGEST_EVENT_KEY=' .env | cut -d= -f2- | tr -d '\r"')
      BODY='{"name":"trip/requested","data":{"tripId":"not-a-uuid"}}'
      curl -X POST "https://inn.gs/e/$KEY" -H "Content-Type: application/json" -d "$BODY"
      ```

      Cheaper and safer than the obvious approach of invalidating
      `GEMINI_API_KEY` in EAS, which costs a generation and two deploys and can
      leave production broken if the restore is forgotten. Reusable whenever the
      failure path needs re-checking; the only residue is one red run in Inngest's
      history.
      *Timing note: the report only appears after the retries are exhausted —
      Inngest still showed "Running" ~40s before the Sentry event landed. Do not
      conclude it failed to report until the run itself has finished failing.*
- [x] Tune the polling interval (3–5s) and hard-stop on a terminal status —
      the interval and the hard-stop were already in `useTripStatus`
      (`src/lib/trips.ts`): 3s, and `refetchInterval` returns `false` once the
      status is in `TERMINAL = ["ready", "failed"]`. This box was simply never
      ticked. It is the only polling site in the app.
      **What was actually missing: it never paused in the background.** React
      Query gates each interval tick on `focusManager.isFocused()`, and that
      falls back to `globalThis.document?.visibilityState !== "hidden"` — on
      React Native there is no `document`, so it is `undefined !== "hidden"`,
      i.e. **true forever**. The default `refetchIntervalInBackground: false` had
      no effect at all. So a backgrounded app kept polling every 3s, draining
      battery and burning free-tier requests (and Cloudflare subrequests, since
      each poll queries Neon). Fixed by wiring `AppState` to
      `focusManager.setFocused` in `useAppStateFocus` (`src/lib/query.ts`), called
      once from `_layout.tsx`.
      **To verify on a device:** start a generation, background the app, and watch
      `adb logcat` (or the EAS Hosting request count) go quiet instead of ticking
      every 3s.
- [x] **Unsplash** attribution in the UI *(photographer + Unsplash link per
        photo, and the download-tracking ping, as their terms require)*
- [x] **OpenStreetMap** attribution in the UI *(the Leaflet tile layer credits
      "© OpenStreetMap contributors" with `attributionControl` on, and
      `src/app/about.tsx` credits place data under the Open Database Licence)*
- [x] Review request usage in the EAS Hosting dashboard
- [~] Apply for Unsplash **production** access — **submitted 16 Aug, status "In
      Review"**. Unsplash quote 5–10 business days. 50 req/hour on Demo → 1,000
      on production. App id `1014838`.
      Submitted with two trip-detail screenshots showing the credit line on the
      photo itself (`Yovan Verma / Unsplash`, `Joy Lim / Unsplash`) and a
      description saying where photos appear and that there is no photo browsing.
      Nothing to do but wait; if it is rejected, the reply names the guideline.
      Their checklist, against this app: hotlinking ✅ (`photo.urls.regular` used
      directly; ImageKit only touches user-uploaded custom covers, never Unsplash
      images) · attribution ✅ (`"{photographer} / Unsplash"` in
      `TripDetailView`, tappable, UTM-tagged via `withUtm`) · no Unsplash
      logo/name ✅ · not replicating Unsplash ✅ (no photo search or browse
      surface) · download tracking ✅ **as of 16 Aug** — it previously fired for
      the cover photo only, which under-reported usage the guidelines require
      reporting.
      **Before applying:** the app description on Unsplash reads "This is AI trip
      planner application", and their checklist asks that name and description
      alone explain what you are building. Say where photos appear and that there
      is no photo browsing. Screenshots are required: use the trip detail screen
      with the credit line visible.
      *Note the Demo tier is now tighter, not looser: pinging every photo costs
      1 search + 5 pings per generation instead of 2 requests, so roughly 8
      generations/hour rather than 25 until production is approved.*

## Phase 8 — Release

See [`docs/RELEASE.md`](docs/RELEASE.md) for the full procedure.

- [x] `eas.json` build profiles; Android keystore generated and stored by EAS
- [x] Internal-distribution APK, installed and verified on a real device
- [x] Over-the-air updates *(`expo-updates`, fingerprint runtime policy, one
      channel per build profile)*
- [x] **A support email that exists** — `tyee834@gmail.com`, one address for
      both support and privacy, across the two app screens and the six legal
      pages. It was `support@triply.app` / `privacy@triply.app`, on a domain
      that was never registered, so every one of those addresses bounced while
      the privacy policy promised them for deletion requests.
      **Verified live on 16 Aug**, by reading the deployed pages rather than the
      source: `support.html` and `delete-account.html` both show
      `tyee834@gmail.com` and mention `triply.app` nowhere. `npx wrangler deploy`
      from `legal/` reported "No updated asset files to upload", so the pages had
      already been deployed and this note was stale — worth knowing, because the
      note itself was the only reason to think users were still being sent to a
      bouncing address.
      *`legal/README.md` and `legal/REVIEWER-NOTES.md` still contain the old
      addresses on purpose: they document what changed and why.*
- [x] Clerk **production** instance — live on `clerk.triply.davidsang.dev`, keys
      `pk_live_` / `sk_live_`, and the deployed backend verifies its tokens.
      Both methods exercised against it on real devices: Google SSO (10 of 10
      restart cycles on 16 Aug, once `@clerk/expo` v4 landed) and email/password
      sign-up, which produced a real `users` row — so password sign-in **is**
      enabled, which was the thing the old note asked to re-check.
      *Two things this box does not cover, tracked separately below: whether
      Google is using **your** OAuth credentials rather than Clerk's shared
      development ones (see Phase 0), and the mobile SSO redirect allowlist,
      which production enforces and development does not — `triply://sso-callback`
      must be listed or `startSSOFlow` throws before a browser opens. See
      `docs/RELEASE.md` step 4.*
- [ ] Replace the iOS icon *(`app.json` → `ios.icon` is still the Expo default)*
- [ ] Play Console account, store listing assets, data safety + content rating
- [ ] Closed test: 12 testers opted in for 14 continuous days
      **This is the critical path.** The 14 days are wall-clock and cannot be
      compressed, shortened by having more testers, or started before the Play
      Console account exists and a build is uploaded to a closed track. Every
      other Phase 8 item can be done in parallel or during those two weeks, so
      this is the one to start first regardless of how finished anything else
      looks. The account also costs a one-time $25 fee.
- [x] Back up the Android keystore *(downloaded 16 Aug via `eas credentials` →
      Android → production → Keystore → Download existing keystore. A copy now
      exists off this machine, together with the keystore password, key alias and
      key password — the file alone cannot sign anything. Type JKS, key alias
      `863f28db…`, release SHA-1 `A3:BE:C0:0C:99:A9:4F:36:47:C5:C5:7C:8F:E7:E4:49:EE:11:9E:3D`
      (fingerprints are public identifiers, not secrets; the SHA-1 is what an
      Android OAuth client would need if Google sign-in ever moves from browser
      SSO to native). Losing the keystore means the app can never be updated on
      Play.)*

---

## Cross-cutting reminders

- [x] Server dependencies are edge/web-standard (Cloudflare Workers, not Node)
      *(verified by the deployment running)*
- [x] Pin `@clerk/expo` (`^4.3.0`, Expo SDK 57)
- [x] Gemini output is `JSON.parse`d in a try/catch and Zod-validated
- [x] Custom trip cover columns migrated *(`customCoverImageUrl`,
      `useCustomCover` — 10/10 migrations applied)*
- [x] Geocoder usage within policy *(1 req/s throttle + cache table)*
- [~] OSM's **public tile server** is for light and personal use only
      (`src/components/trip/TripMap.tsx`). **Code switched to MapTiler on 22
      Aug — verified on device the same day.** The tile URL comes from
      `EXPO_PUBLIC_MAPTILER_KEY`, and OSM is the *fallback* used only when that
      is unset — so a fresh clone still shows a map, and a real build does not
      use OSM at all. Free tier is ~100k tile requests/month, no card.
      **Proof:** a trip's map draws MapTiler tiles and the credit line reads
      "Leaflet | © MapTiler © OpenStreetMap contributors". The key is set in
      `.env` and in **all three** EAS environments (`development`, `preview`,
      `production`, plaintext) — checked with `eas env:list`, because a
      local-only value reaches no real build. Ships with `eas update`; no
      rebuild needed.
      *Tiles are requested as `.webp`, not `.png`: measured against the live
      endpoint on a central-Paris tile at z12, 141 KB against 268 KB for the
      same picture. A map view pulls roughly eight tiles, so that is about 1 MB
      saved per trip opened. Retina (`{r}` → `@2x`) stays on — dropping it would
      save more, 46 KB a tile, but a blurry map is a visible cost.*
      **Still to do:** lock the key. In the MapTiler key settings set **Allowed
      user-agent header** to `TriplyApp`, then re-open a trip to confirm it
      still draws. Until that is set, a copied key works for anyone.
      *`TriplyApp` is deliberately not `Triply`: `NOMINATIM_USER_AGENT` is
      already `Triply/1.0`, and a substring match on `Triply` would also match
      the geocoder's traffic.*
      *The key is `EXPO_PUBLIC_`, so it is readable by anyone who unpacks the
      app, and hiding it is not an option — proxying tiles through our Worker
      would spend a Cloudflare subrequest per tile. It is **restricted** instead:
      set the key's **Allowed user-agent header** to `TriplyApp`, which is the
      substring `TILE_USER_AGENT` appends to the WebView's agent via
      `applicationNameForUserAgent` (a shared prop — Android and iOS both).
      Not real security, since a header can be forged, but it stops the casual
      copy-paste case, which is the realistic one.*
      *Leave **Allowed HTTP Origins** empty. Leaflet loads tiles as plain `<img>`,
      which sends no `Origin` header, and MapTiler rejects "unknown" origins as
      soon as that list is non-empty — filling it in blanks the map.*
      *Still outstanding, separately: Leaflet itself is loaded from the unpkg
      CDN inside the WebView, so the map depends on unpkg staying up.*
- [~] No test framework — `npx tsc --noEmit` and `npm run lint` are the only
      gate, and until 22 Aug nothing ran them except a human remembering to.
      `.github/workflows/ci.yml` now runs both on every pull request and on
      pushes to `main`. **Not yet proven** — it has never run; the first PR
      after this is what confirms it.
      Both pass locally as of 22 Aug (0 type errors; 0 lint errors, 1 pre-existing
      warning in the generated `.expo/types/router.d.ts`, which `expo lint` does
      not fail on).
      Two decisions worth keeping: the workflow calls `npx tsc --noEmit` and
      `npm run lint` **directly** rather than adding `package.json` scripts,
      because a new script changes the Expo fingerprint and a changed
      fingerprint means the next `eas update` cannot reach the current build.
      And it reads Node from `.nvmrc`, so CI can never drift onto the Node 24
      that breaks three things in this project.
      **A clean checkout is not the same as your machine, and the first run
      proved it.** `expo-env.d.ts` and `.expo/types/` are both gitignored, so CI
      has neither. `expo-env.d.ts` is what carries
      `/// <reference types="expo/types" />`, and without it the CSS module
      declarations are missing, so `import "../../global.css"` in
      `src/app/_layout.tsx` fails with `TS2882`. Fixed by `types/global.d.ts`,
      a committed file holding that same reference — repeating it is harmless
      locally (TypeScript dedups) and is what makes a clean checkout pass.
      Deliberately not un-ignoring the generated file, which says it should not
      be edited and would show a diff on every regeneration.
      `.expo/types/` (typed routes) turns out **not** to be needed: nothing
      failed without it.
      *This was checked before the first push and reported as passing — it was
      not. The local command's output was trusted instead of its exit code. The
      re-check runs `tsc` on a simulated clean checkout, writes the raw output
      to a file, and reads `TSC_EXIT` explicitly.*
- [ ] Cloudflare **subrequest limit** watch — every `neon-http` query counts as
      one. Seen once on 3 Aug with no failures; see "Known limits" in
      `docs/RELEASE.md`.
