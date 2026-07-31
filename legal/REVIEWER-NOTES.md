# Reviewer notes — Privacy Policy & Terms of Service

Internal notes for whoever finishes and reviews `public/privacy.html` and
`public/terms.html`. Not published — this file sits outside `public/`, so
Cloudflare never serves it.

**Both documents are drafts and must be reviewed by a qualified lawyer before
Triply is released.** They were written from a read of this repository, so they
describe what the code actually does — but "accurate about the product" is not
the same as "legally sufficient in your jurisdiction".

---

## 1. Confirmed decisions

These were decided by the developer and are already written into both documents:

| Item | Decision |
|---|---|
| Contact domain | `triply.app` — `privacy@triply.app` and `support@triply.app`, matching `src/app/privacy-policy.tsx:43` and `src/app/help-center.tsx:38`. The landing page's `support@triply.com`, which came from the design mock, was corrected. |
| Publisher | An individual developer, not a company. Both documents name `[FULL LEGAL NAME]`. |
| Governing law | Singapore, with exclusive jurisdiction in the Singapore courts, subject to consumer-law rights to sue locally. |
| Minimum age | 18+. |

## 2. Placeholders still to fill

Search both files for `[` — every placeholder is in square brackets.

- `[EFFECTIVE DATE]` — both files. Use the date you publish, not today's date.
- `[FULL LEGAL NAME]` — both files. The name that appears on official documents.
- `[POSTAL ADDRESS]` — both files, three places. A contactable address is a
  legal requirement in most jurisdictions and is also required by the app
  stores. If you do not want a home address public, use a registered agent or a
  business mailbox.
- `[COUNTRY]` — privacy §2, where you are based as data controller.
- `[LIABILITY CAP, e.g. SGD 100]` — terms §15. A cap far below any plausible
  loss can be struck out as unreasonable; take advice on the figure.
- `[RETENTION PERIOD]` for support email — privacy §10.
- `[RESPONSE TIME, e.g. 30 days]` for data requests — privacy §11.
- `[CONFIRM: free or paid Gemini tier]` — privacy §8. See item 4 below.
- `[CONFIRM: Sentry and Clerk retention]` — privacy §10.
- `[CONFIRM: Neon and Clerk hosting region]` — privacy §9.

## 3. Assumptions to correct if wrong

1. **Singapore PDPA is the baseline, GDPR is addressed defensively.** The
   documents include GDPR-shaped sections (legal bases, data subject rights,
   international transfers) because the app is on public app stores and will
   reach EU users. If you intend to geo-restrict, this can be trimmed.
2. **No paid tier at launch.** Verified: there is no billing, payment, or
   subscription code anywhere in the repo. Terms §4 states this positively, so
   it must be revisited before any monetisation.
3. **Apple sign-in is not offered.** `src/components/SocialAuthButtons.tsx:66-88`
   is a placeholder that shows a "Coming soon" alert. Both documents list only
   email/password and Google. Update when Apple is wired up — note that Apple
   requires "Sign in with Apple" if you offer any other social sign-in.
4. **Gemini free tier is assumed.** `src/server/ai/rate-limit.ts` and the
   user-facing "free-tier limit reached" copy indicate the free tier, and
   `src/server/ai/gemini.ts:11-12` says outright that the free tier "may train
   on prompts". Google's data terms differ sharply between the free and paid
   tiers, so confirm which you launch on and restate privacy §8 to match. This
   is the single most consequential unknown in the privacy policy.
5. **Retention is "until the user deletes it".** There is no scheduled deletion
   or expiry job anywhere in the repo. If you add one, update privacy §10.
6. **Breach notification is promised** in privacy §13. That is a legal duty in
   most jurisdictions anyway, but note it is a commitment you must be able to
   honour — you need a way to email affected users.
7. **Data export is manual.** There is no export feature in the app, so privacy
   §11 says requests are handled by hand over email. If you get a request, you
   must actually fulfil it — the data lives in Neon and can be extracted with a
   query per user id.

## 4. Facts the documents rely on, with sources

Verified against the repo at the time of writing. If any of these change, the
matching section needs updating.

**What is stored** — `src/server/db/schema.ts`
- `users` (20-32): Clerk user id as primary key, email, name, image URL, timestamps.
- `trips` (65-116): destination, days, travellers, budget level, interests, pace,
  generated title/summary, Unsplash cover + attribution, custom cover URL and
  ImageKit `fileId`, status, error message.
- `days` (118-129), `activities` (131-150): day themes, activity name,
  description, estimated cost, place name, lat/lng, `placeVerified` flag.
- `chat_conversations` (157-174): auto-derived title.
- `chat_messages` (181-215): role and full message `content` for both sides.
- `place_cache` (219-228): normalized query and geocode result — not user-linked.
- `destinations` (234-258): curated content, identical for every user.

**Deletion cascades** — every user-owned table has
`references(() => users.id, { onDelete: "cascade" })`, so one `DELETE FROM users`
removes trips → days → activities and conversations → messages
(`src/server/inngest/functions.ts:125-130`).

**Account deletion flow** — `src/app/api/account+api.ts:20-50` deletes the Clerk
user; Clerk's `user.deleted` webhook (`src/app/api/webhooks/clerk+api.ts:45-53`)
becomes an Inngest event; `syncUserDeleted`
(`src/server/inngest/functions.ts:105-149`) erases the rows and then
best-effort-deletes ImageKit files. On-device preferences are cleared by
`clearPreferences()` in `src/lib/preferences.ts:55-61`, called from
`src/lib/account.ts`.

**Limits** — `MAX_TRIPS = 5` (`src/app/api/trips+api.ts:9`), enforced in one SQL
statement (81-89) so concurrent requests cannot both pass; 1-7 days, 1-10
travellers, ≤10 interests (`createTripSchema`, 11-18); message ≤4000 chars
(`src/app/api/chat+api.ts:41`); 30-turn history window (16); cover upload ≤8 MB
and must be `image/*` (`src/app/api/trips/[id]/cover+api.ts:14, 44-49`).

**What reaches Gemini** — trip generation sends only `TripParams`
(`src/server/ai/gemini.ts:13-20`), with an explicit comment (11-12) that no
personal data crosses that boundary. Chat sends the user's message plus history
and, for trip chat, an itinerary summary (`src/app/api/chat+api.ts:243-264`); the
system prompt tells the model never to ask for identity details (55).

**Telemetry** — `Sentry.init` in `src/app/_layout.tsx:42-63`:
`sendDefaultPii: __DEV__` (so no IP in release builds), `tracesSampleRate` 0.2 in
production, `replaysOnErrorSampleRate` 0.5, `replaysSessionSampleRate` 0.01, and
mobile replay masking all text/images/vectors by default. Logs carry endpoint,
method, status, and a fixed `failure_kind` (`src/lib/api.ts:117-135`) — never
server message text. **The exception:** `src/lib/chat.ts:125` and `151-152` put
the user's message and the model's reply on `gen_ai.input.messages` /
`gen_ai.output.messages`. `AGENTS.md` records this as a deliberate trade-off.
There is no `Sentry.setUser` call anywhere, so events are not tagged with an
account id.

**Security controls** — bearer token verified per request with a production-
mandatory `authorizedParties` allowlist (`src/server/auth.ts:12-44`); every
data route filters by the token's user id; Clerk webhooks verified with
`verifyWebhook` (`src/app/api/webhooks/clerk+api.ts:13`); session token in
`expo-secure-store`; `neon-http` over HTTPS (`src/server/db/index.ts`).

**Not present, so not claimed** — no payment or billing code; no location
permission; no push notifications (`expo-notifications` is not a dependency);
no analytics or advertising SDK; no age gate; no consent management; no data
export; `expo-device` is installed but unused. This website itself ships no
JavaScript and loads nothing cross-origin, which is why privacy §4.7 can state
there are no cookies.

## 5. Keep these in sync

The in-app screens duplicate parts of this content and will drift:

- `src/app/privacy-policy.tsx` — a short summary, subtitled "Draft — pending
  legal review". Its contact address already matches (`privacy@triply.app`).
  Consider replacing the body with a link to `https://[DOMAIN]/privacy` once
  these pages are live, so there is one source of truth.
- `src/app/about.tsx` — carries the OpenStreetMap and Unsplash attributions that
  terms §10 repeats.
- `src/app/help-center.tsx` — support address.

One wording difference worth knowing: the in-app screen says place lookups go to
"OpenStreetMap", while the code calls Photon at `photon.komoot.io`
(`src/server/places/geocode.ts:22-28`). Photon is an OpenStreetMap-based
geocoder, so the app's wording is not wrong, but the privacy policy names Photon
explicitly because that is the company receiving the request.

## 6. Store submission checklist

- Both stores need a public privacy policy URL: use `https://[DOMAIN]/privacy`.
- Apple's App Privacy questionnaire will ask about the categories in privacy
  §4 — declare Contact Info (email, name), User Content (photos, messages),
  Identifiers (account id), and Diagnostics, all linked to the user's identity.
  Declare "Data Used to Track You: No".
- Google Play's Data safety form needs the same list, plus the deletion route:
  the app has in-app account deletion, which Play requires.
- Confirm the age rating matches the 18+ minimum in terms §2.
