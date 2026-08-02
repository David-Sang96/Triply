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
- `expo-updates` is not installed, so there are no over-the-air updates. Every
  change needs a new build.

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
from the CLI:

```powershell
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://<your-app>.expo.app --visibility plaintext
eas env:create --environment production --name CLERK_SECRET_KEY --value <secret> --visibility secret
```

**Client variables** — these get baked into the app binary, so they must never
hold a secret:

| Name                                | Value                                     |
| ----------------------------------- | ----------------------------------------- |
| `EXPO_PUBLIC_API_URL`               | the deployed origin, e.g. `https://triply.expo.app` |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **production** publishable key       |
| `EXPO_PUBLIC_SENTRY_DSN`            | Sentry DSN                                 |

**Build-machine variable:**

| Name                | Why                                              |
| ------------------- | ------------------------------------------------ |
| `SENTRY_AUTH_TOKEN` | uploads source maps, so crash traces are readable |

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

### 5. Deploy the backend

```powershell
npx expo export --platform web
eas deploy --prod
```

Note the origin it prints. That value goes into `EXPO_PUBLIC_API_URL` (step 3),
and into `CLERK_AUTHORIZED_PARTIES`.

Then point the production Clerk webhook and the Inngest Cloud app URL at
`<origin>/api/inngest` and the Clerk webhook route.

### 6. Migrate the production database

```powershell
npm run db:migrate
```

Run this with the **production** `DATABASE_URL`. Migrations alter tables, so
existing rows survive. Never use `db:push` here — it wipes data.

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

## Release checklist

- [ ] `npm run lint` passes
- [ ] Support / privacy email addresses actually receive mail (see step 2b)
- [ ] Clerk is on a production instance
- [ ] `CLERK_AUTHORIZED_PARTIES` is set for the production environment
- [ ] `npm run db:migrate` applied against the production database
- [ ] `eas deploy --prod` run, and `EXPO_PUBLIC_API_URL` points at that origin
- [ ] Clerk webhook and Inngest Cloud point at the deployed origin
- [ ] `expo.version` in `app.json` bumped if this is a user-visible release
- [ ] Build tested from the install link on a real device before submitting
