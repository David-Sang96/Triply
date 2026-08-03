# Triply

An AI trip planner for iOS and Android. Describe a trip and Gemini generates a
day-by-day itinerary of real, geocoded places — with photos, a map, and an
assistant you can ask follow-up questions.

Built with Expo SDK 57. The backend lives in the same repo as Expo Router API
routes and runs on Cloudflare Workers.

## Features

- **AI itineraries** — destination, length, travellers, budget and interests in;
  a structured day-by-day plan out
- **Verified places** — every activity is geocoded, so the map shows real
  locations rather than plausible-sounding names
- **Photos** — destination imagery from Unsplash, delivered through ImageKit,
  with a custom cover you can upload yourself
- **Assistant** — chat about a specific trip or start a general conversation
- **Accounts** — email and password or Google, with account deletion in-app

## Stack

| Layer | Choice |
| ----- | ------ |
| App | Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript (strict) |
| Routing | Expo Router, typed routes, native tabs |
| Styling | NativeWind v5 on Tailwind v4 |
| Data | TanStack Query |
| Backend | Expo Router API routes on Cloudflare Workers (EAS Hosting) |
| Database | Neon Postgres · Drizzle ORM |
| Auth | Clerk |
| AI | Google Gemini (structured JSON output) |
| Jobs | Inngest |
| Geocoding | Photon (OpenStreetMap) |
| Images | Unsplash · ImageKit |
| Monitoring | Sentry |

## Getting started

Requires Node 20+, and **JDK 17** for Android native builds — JDK 24 and 25
break the CMake step. The path is pinned in `android/gradle.properties`; your
machine default can stay newer.

```bash
git clone git@github.com:David-Sang96/Triply.git
cd Triply
npm ci
cp .env.example .env.local
```

Fill in `.env.local` — `.env.example` documents every variable and which are
required. Then:

```bash
npm run db:migrate     # apply the schema to your Neon database
npm run db:check       # confirm it connects and is up to date
npm start              # dev server
```

Google sign-in needs a **development build**, not Expo Go:

```bash
npm run android
```

### Running the backend locally

The Clerk webhook → Inngest → database chain needs two more processes, each in
its own terminal:

```bash
npm run inngest:dev    # local Inngest dev server
npm run tunnel         # ngrok, so Clerk can reach the webhook route
```

Point a Clerk webhook at `<ngrok-url>/api/webhooks/clerk` for `user.created`,
`user.updated` and `user.deleted`.

## Project layout

```
src/
  app/               screens and API routes (file-based routing)
    (auth)/          welcome, sign-in, sign-up
    (tabs)/          home, assistant, trips, profile
    api/             *+api.ts — the backend, Workers runtime
  components/        UI, grouped by feature
  server/            server-only code: db, ai, inngest, places
  lib/               client-side data access and helpers
  shared/            types shared across the client/server boundary
  theme/             colour tokens
drizzle/             generated SQL migrations — append-only
docs/RELEASE.md      how to deploy and publish
legal/               the privacy/terms site, deployed separately
```

App code lives in `src/app`, **not** the repo-root `app/`. Imports use the
`@/` alias (`@/*` → `src/*`).

## Commands

| Command | What it does |
| ------- | ------------ |
| `npm start` | Dev server |
| `npm run android` / `ios` | Native development build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run db:generate` | Generate a migration from `schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:check` | Read-only: connection + migration status |
| `npm run db:studio` | Browse the database |
| `npm run inngest:dev` | Local Inngest dev server |
| `npm run tunnel` | ngrok tunnel for webhooks |

`db:push` exists but recreates tables and **wipes data** — it is for throwaway
resets only. Schema changes go through `db:generate` and `db:migrate`.

## Deploying

Three targets, depending on what changed:

| Changed | Command |
| ------- | ------- |
| API routes, `src/server/**` | `npx expo export --platform web && eas deploy --environment production --prod` |
| Screens, components, TS logic | `eas update --channel preview -m "..."` |
| `app.json`, plugins, native deps | `eas build --profile preview --platform android` |

`runtimeVersion` uses the fingerprint policy, so an over-the-air update is only
offered to a build whose native code matches.

**[`docs/RELEASE.md`](docs/RELEASE.md)** is the full guide: environment
variables and their visibility rules, the sign-up webhook chain, the Google
Play requirements, and the known limits.

## Contributing

There is no test framework yet, so `npx tsc --noEmit` and `npm run lint` are
the gate. Both must pass before a pull request is opened.

[`AGENTS.md`](AGENTS.md) holds the non-negotiable rules — Workers-compatible
server code, native tabs, NativeWind over `StyleSheet`, and what may go into
telemetry. Read it before opening a PR.

## Licence

MIT — see [LICENSE](LICENSE).
