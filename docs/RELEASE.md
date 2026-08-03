# Releasing Triply

How to put Triply in other people's hands. Two routes:

- **Route A — a shareable install link.** One URL. Anyone on Android taps it and
  installs. No store account needed. Do this first.
- **Route B — Google Play.** Public listing. Slower, because of Google's testing
  rule (see below).

Both routes need the same groundwork, so do "Groundwork" once.

> **Who runs what:** every command in this file is developer-run. Agents must
> not run `eas build`, `eas deploy`, or `eas submit` — same rule as the dev
> server (see `AGENTS.md`).

---

## Key facts about this repo

- `android/` and `ios/` are **gitignored**. EAS generates them at build time
  from `app.json`. So `app.json` is the source of truth for the app id, icons,
  and plugins — not `android/app/build.gradle`.
- The backend is **part of this app** (`src/app/**/*+api.ts`, `web.output` is
  `"server"`). It is deployed separately to EAS Hosting. The app then talks to
  it over `EXPO_PUBLIC_API_URL` (`src/lib/api.ts`).
- `.env` / `.env.local` are for local development only. Release builds and the
  hosted backend read variables from **EAS**, not from those files.
- **JavaScript-only changes ship over the air**, without a rebuild — see
  "Shipping a JS-only change" below. Native changes still need a build.

---

## Groundwork (once)

### 1. Install and log in

```powershell
npm install -g eas-cli
eas login
eas init
```

`eas init` writes `extra.eas.projectId` and `owner` into `app.json`. Commit that
change.

### 2. Check the app id

`app.json` → `expo.android.package` is `com.davidsang.triply`. **This can never
change after the first Play upload.**

It was renamed from `com.david_sang.TRIPLY`. EAS regenerates `android/` from
`app.json`, so cloud builds pick this up automatically. Your local `android/`
folder still holds the old id until the next `npx expo prebuild --clean` — which
also means the next local dev build installs as a *second* app next to the old
one.

### 2b. Fix the support email addresses

The app and the legal site tell users to write to `support@triply.app` and
`privacy@triply.app`. **These mailboxes do not exist.** Google Play requires a
support email that receives mail, and the privacy policy promises a working
address for deletion requests. Shipping with dead addresses is both a policy
failure and a broken promise to users.

22 references across 8 files:

- `src/app/help-center.tsx`, `src/app/privacy-policy.tsx`
- `legal/public/`: `index.html`, `privacy.html`, `terms.html`, `support.html`,
  `delete-account.html`, `404.html`

Two ways to fix it:

1. Buy `triply.app` and add email forwarding to an inbox you read. Keeps the
   branding.
2. Replace every address with one you already control, then redeploy the legal
   site with `npx wrangler deploy` from `legal/`.

### 3. Put the secrets in EAS

`eas.json` maps each build profile to an EAS *environment*:

| Build profile | EAS environment |
| ------------- | --------------- |
| `development` | `development`   |
| `preview`     | `preview`       |
| `production`  | `production`    |

Create the variables in the EAS dashboard (Project → Environment variables), or
from the CLI with `eas env:create`. Check them with `eas env:list`.

**Visibility matters.** EAS offers three levels, and **EAS Hosting cannot read
`secret` ones** — a deployment using them fails. So:

| Visibility  | Use it for                                              |
| ----------- | ------------------------------------------------------- |
| Plain text  | anything `EXPO_PUBLIC_*` — it ends up in the app anyway  |
| Sensitive   | **every server secret** — hidden in the UI and in logs, but still readable by the deployment |
| Secret      | build-time only, e.g. `SENTRY_AUTH_TOKEN`. Never for a variable an API route needs. |

**Client variables** — these get baked into the app binary, so they must never
hold a secret:

| Name                                | Value                                     |
| ----------------------------------- | ----------------------------------------- |
| `EXPO_PUBLIC_API_URL`               | the deployed origin, e.g. `https://triply.expo.app` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **production** publishable key       |
| `EXPO_PUBLIC_SENTRY_DSN`            | Sentry DSN                                 |

**Build-machine variable — required, not optional:**

| Name                | Why                                              |
| ------------------- | ------------------------------------------------ |
| `SENTRY_AUTH_TOKEN` | uploads source maps, so crash traces are readable |

Without it **the Android release build fails**, it does not merely skip the
upload. `@sentry/react-native/sentry.gradle` runs sentry-cli on every release
build and a missing token exits non-zero:

```
error: Auth token is required for this request.
> Task :app:createBundleReleaseJsAndAssets_SentryUpload_... FAILED
```

Use an **organization** auth token (Sentry → Settings → Developer Settings →
Auth Tokens, scopes `project:releases` + `org:read`), not a personal one — a
personal token dies with the account that made it. Store it with **Secret**
visibility in the `preview` and `production` environments. Secret is fine here
precisely because no API route reads it; only the build machine does.

**Server variables** — needed by the EAS Hosting deployment, never by the app:

| Name                           | Note                                            |
| ------------------------------ | ----------------------------------------------- |
| `DATABASE_URL`                 | Neon HTTP connection string                     |
| `CLERK_SECRET_KEY`             | Clerk **production** secret key                 |
| `CLERK_WEBHOOK_SIGNING_SECRET` | from the production Clerk webhook endpoint      |
| `CLERK_AUTHORIZED_PARTIES`     | **required in production** — the server refuses to start without it. Set it to the deployed origin plus the app scheme, e.g. `https://triply.expo.app,triply://` |
| `GEMINI_API_KEY`               |                                                 |
| `UNSPLASH_ACCESS_KEY`          |                                                 |
| `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT` |          |
| `NOMINATIM_USER_AGENT`         | optional courtesy contact string                |
| `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` | from Inngest Cloud                  |

Do **not** set `INNGEST_DEV` in production.

### 4. Switch Clerk to a production instance

Clerk `pk_test_` / `sk_test_` keys are for development only. A shipped app needs
a Clerk production instance. That needs a domain and DNS records. Do this before
any build that real people will use, then update the three Clerk variables above.

**Turn password sign-in back on.** A new instance starts from Clerk's defaults,
and the development instance shipped with password *disabled as a sign-in
strategy* — enabled and required at sign-up, so accounts stored a password, but
`used_for_first_factor: false`, so no one could ever sign in with it. Every
email/password user was locked out; only Google worked. Set it under
**Configure → User & authentication → Email, phone, username → Authentication
strategies → Password**.

Read the instance's real configuration rather than trusting the dashboard's
wording — the endpoint is public, and the publishable key's middle segment
base64-decodes to the host:

```sh
curl -s https://<slug>.clerk.accounts.dev/v1/environment?_is_native=true \
  | jq '.user_settings.attributes | {email_address, password}'
```

`password.first_factors` must contain `"password"`. An empty array is the
broken state described above.

The sign-in screen only handles a `complete` status; any other one reports the
status and supported factors to Sentry (`src/app/(auth)/sign-in.tsx`) and tells
the user to try Google. So if this is misconfigured again, Sentry names the
step Clerk wanted instead of leaving you guessing.

### 5. Deploy the backend

**First time only — the chicken-and-egg.** Two variables need the deployed
origin, but you only learn the origin by deploying. And `CLERK_AUTHORIZED_PARTIES`
cannot simply be added afterwards: `src/server/auth.ts:16` throws at module
load when it is missing in production, and `eas deploy` loads each worker to
validate it. So the deploy **fails outright** rather than deploying a broken
backend.

Resolve it by claiming the subdomain first:

1. Run `eas deploy --environment production --prod`. It prompts for a
   subdomain. Choose one. The deploy then fails on `CLERK_AUTHORIZED_PARTIES` —
   expected.
2. Your origin is `https://<that-subdomain>.expo.app`. Set the two remaining
   variables with it.
3. Run the same deploy command again. It succeeds.

```powershell
npx expo export --platform web
eas deploy --environment production --prod
```

`--environment production` is what injects the server variables from step 3 into
the API routes. Without it the routes run with no configuration. `--prod`
promotes the deployment to the stable production URL instead of a one-off
preview URL.

Note the origin it prints. That value goes into `EXPO_PUBLIC_API_URL` (step 3),
and into `CLERK_AUTHORIZED_PARTIES`.

### 5b. Wire the sign-up chain — do not skip this

A `users` row is created in exactly one place: the Clerk webhook. Nothing
creates it lazily.

```
Clerk user.created
  -> POST <origin>/api/webhooks/clerk   (src/app/api/webhooks/clerk+api.ts)
  -> inngest.send('clerk/user.created')
  -> syncUserCreated                    (src/server/inngest/functions.ts:47)
  -> INSERT INTO users
```

`trips.userId` has a foreign key to `users.id` (`src/server/db/schema.ts:69`).
So if that chain is broken in production, a new user can sign in, and every
read works, but the first `POST /api/trips` dies on a foreign-key violation.
The insert is not wrapped in try/catch (`src/app/api/trips+api.ts:81`), so the
user sees an unhandled 500 with no error body.

In development this chain runs over ngrok into the local Inngest dev server.
Production needs its own wiring:

1. **Inngest Cloud** — create the production app, copy `INNGEST_SIGNING_KEY`
   and `INNGEST_EVENT_KEY` into the EAS `production` environment as
   **sensitive** variables. Do not set `INNGEST_DEV`.
2. **Sync the app URL** in Inngest Cloud to `<origin>/api/inngest`.
3. **Clerk webhook** — in the Clerk dashboard, add an endpoint pointing at
   `<origin>/api/webhooks/clerk`, subscribed to `user.created`, `user.updated`
   and `user.deleted`. Copy that endpoint's signing secret into
   `CLERK_WEBHOOK_SIGNING_SECRET`. It is a *different* secret from the ngrok
   one you use locally.
4. **Test it before sharing the build.** Sign up with a fresh email, then check
   the `users` table with `npm run db:studio`. If no row appears, the chain is
   broken and every new user will hit the 500 above.

There is also a race window even when the wiring is correct: the app can reach
the API before the webhook job commits the row. It is small, but a slow webhook
turns the user's first trip into a 500.

### 5c. Variables never read

`IMAGEKIT_PUBLIC_KEY` and `IMAGEKIT_URL_ENDPOINT` are listed in `.env.example`
but no code reads them. They are safe to skip.

### 6. Migrate the production database

Check the state first — read-only, safe to run any time:

```powershell
npm run db:check
```

It confirms `DATABASE_URL` connects and reports how many migrations are applied
versus how many files are in `drizzle/`. If it says PENDING:

```powershell
npm run db:migrate
```

Run this with the **production** `DATABASE_URL`. Migrations alter tables, so
existing rows survive. Never use `db:push` here — it wipes data.

---

## Shipping a JS-only change

`expo-updates` is installed and each build profile publishes to a channel of
the same name (`eas.json`). So a change that touches only JavaScript — screens,
components, most logic — reaches installed apps in seconds:

```powershell
eas update --channel preview --message "what changed"
```

Testers get it the next time they open the app. No rebuild, no reinstall.

**What still needs a build.** Anything native: `app.json` (icons, splash,
permissions, `userInterfaceStyle`), config plugins, and any added or upgraded
native package.

`runtimeVersion` uses the `fingerprint` policy, which hashes the native project
state. An update is only offered to a build whose fingerprint matches, so a
JS bundle can never land on a binary whose native code it does not fit.

**This is stricter than "did I touch native code".** The fingerprint includes
`package.json`, so **adding or upgrading any dependency ends over-the-air
delivery to every existing install** — even a pure-JavaScript package. It
happened on 3 Aug: `zod` was declared as a direct dependency the same day the
build was made, and the next `eas update` published against a fingerprint the
installed APK did not have. The update succeeded, and reached nobody.

`eas update` reaches an installed app only while all of these are unchanged
since it was built:

- `package.json` dependencies
- `app.json` native config — icons, splash, permissions, `userInterfaceStyle`
- config plugins and native packages

Change any of them and you need a build. Everything else — screens, components,
logic, copy — goes over the air.

Check before you rely on it. This compares what an update would target against
what a build actually has:

```powershell
npx expo-updates fingerprint:generate --platform android   # local
eas build:view <build-id>                                  # "Runtime Version"
```

If those differ, the update will publish and silently reach nobody. It fails
safe — it never ships a mismatched bundle — but "safe" and "delivered" are not
the same thing.

**Server code is separate again.** API routes under `src/app/**/*+api.ts` are
neither an update nor a build; they ship with `eas deploy` (step 5).

Three ways to ship, then:

| Changed | Command | Reaches users |
| ------- | ------- | ------------- |
| API routes, `src/server/**` | `eas deploy --environment production --prod` | immediately |
| Screens, components, TS logic | `eas update --channel preview` | on next app open |
| `app.json`, plugins, native deps | `eas build` + install | after they install |

---

## Route A — shareable install link

```powershell
eas build --profile preview --platform android
```

The `preview` profile has `"distribution": "internal"`, so EAS produces an
**APK** and gives you an install page URL. Share that URL. Anyone with the link
can install it on Android.

iOS is harder: each tester's device must be registered with
`eas device:create` before the build. Android has no such limit.

---

## Route B — Google Play

### The blocker to plan around

A **personal** Play developer account created after 13 November 2023 must run a
closed test with **12 testers who stay opted in for 14 continuous days** before
it can apply for production access. The 14 days only start once Google approves
the release *and* all 12 testers have joined. If a tester drops out, the counter
resets. Organisation accounts are exempt. Budget 3–4 extra weeks.

### Steps

1. Create a Play Console account (25 USD, one time).
2. Create the app in Play Console. The package name must match
   `app.json` → `expo.android.package` exactly.
3. Build the release bundle:
   ```powershell
   eas build --profile production --platform android
   ```
   `autoIncrement` plus `appVersionSource: "remote"` means EAS manages
   `versionCode` for you. Bump `expo.version` in `app.json` by hand when you
   want a new user-visible version number.
4. Upload:
   ```powershell
   eas submit --platform android --profile production
   ```
   The first run walks you through creating a Google service account key. The
   `submit` profile targets the `internal` track — change it to `production`
   once the app is approved for production.
5. Store listing assets:
   - app icon 512×512 PNG
   - feature graphic 1024×500
   - at least 2 phone screenshots
   - short description (80 chars) and full description (4000 chars)
6. Policy forms: Data safety, content rating, target audience, ads declaration.
   The privacy policy and account deletion pages are already live on the legal
   site — paste those URLs.
7. Run the closed test, then apply for production access.

---

## Known limits

**Cloudflare subrequests.** A Worker invocation may only make so many outbound
requests, and with the `neon-http` driver **every database query counts as
one**, not just `fetch` calls. On 3 Aug the deployment logged a burst of:

```
Too many subrequests by single Worker invocation.
```

followed each time by an SDK message about "a custom fetch implementation",
which is the follow-on complaint from whichever client had its request
rejected — not a separate problem.

Nothing failed. Inngest retries a failed step, the retry succeeded, and
**Inngest → Runs showed zero failed runs**, which is why no trip or sign-up was
affected. The source was never identified: `generateTrip` runs each geocode as
its own step, `geocodePlace` makes three subrequests, and `finalize` writes
with a single `db.batch([...])` — none of them come close to the cap on their
own.

Where it would bite first, if it returns: a trip long enough that one step does
many queries, or `syncUserDeleted`, whose `delete-uploaded-covers` step loops
over ImageKit deletions inside a single `step.run`
(`src/server/inngest/functions.ts:137`) — one subrequest per uploaded cover.

If it recurs and a run actually fails, check **Inngest → Runs** first: the
failing step names the code. The fix is to split that step's work into several
`step.run` calls, since each one is a fresh invocation with a fresh budget.

## Release checklist

- [ ] `npm run lint` passes
- [ ] Support / privacy email addresses actually receive mail (see step 2b)
- [ ] Clerk is on a production instance
- [ ] Clerk password sign-in enabled — `password.first_factors` contains
      `"password"` (see step 4); an empty array locks out every
      email/password user
- [ ] Signed in on a real device with email + password, not only with Google
- [ ] `CLERK_AUTHORIZED_PARTIES` is set for the production environment
- [ ] `npm run db:migrate` applied against the production database
- [ ] `eas deploy --prod` run, and `EXPO_PUBLIC_API_URL` points at that origin
- [ ] Clerk webhook and Inngest Cloud point at the deployed origin
- [ ] `expo.version` in `app.json` bumped if this is a user-visible release
- [ ] Build tested from the install link on a real device before submitting
