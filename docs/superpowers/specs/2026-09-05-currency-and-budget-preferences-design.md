# Currency and budget preferences — design

**Date:** 5 September 2026
**Status:** approved in chat, not yet implemented

Make the Currency and Travel Budget rows on the Profile screen do something,
the way Language now does.

---

## 1. Where things stand

`src/lib/preferences.tsx` already stores all three preferences in
`expo-secure-store`, and the Profile screen already edits all three. Language
is wired through to i18next and to the AI. **Currency and budget are read by
nothing.** They are exactly where language was before it was wired up — the
file says so itself about the five decorative languages it replaced.

Concretely:

| Thing | Where | State |
| ----- | ----- | ----- |
| `preferences.currency` | `src/lib/preferences.tsx:22` | stored, never read |
| `preferences.budget` | `src/lib/preferences.tsx:23` | stored, never read |
| Activity cost rendering | `src/components/trip/TripDetailView.tsx:217` | hardcoded `` `$${activity.estCostUsd}` `` |
| Cost in the AI chat context | `src/app/api/chat+api.ts:141` | hardcoded `` ` (~$${a.estCostUsd})` `` |
| Generate screen budget | `src/app/generate.tsx:51` | hardcoded `useState<Budget>("Mid-range")` |
| The prompt | `src/server/ai/gemini.ts:54` | "the approximate total cost in **US dollars**" |

Costs are stored as whole dollars: `activities.est_cost_usd integer`.

**The same three budget values are declared four times** — `src/data/generate.ts:8`,
`src/lib/preferences.tsx:23`, `src/lib/trips.ts:23` (a hand-written union) and
the `budget_level` pgEnum in `src/server/db/schema.ts:53`. Since this work
touches two of them, they collapse to one (§6).

## 2. Decisions taken

These were settled in conversation and are not reopened by this document.

1. **Currency converts at display time.** Costs stay in USD in the database.
   Changing the setting reprices every trip the user already has, including old
   ones. The AI keeps quoting dollars; `gemini.ts:54` does not change.
2. **The kyat rate is set by hand, server-side, changeable without a deploy.**
3. **The budget setting prefills the Generate screen** and nothing else. It is a
   starting point, not a lock — the user can still change it per trip.

### Why the kyat is a special case

Only one free feed carries MMK at all, and it carries the wrong number:

| Feed | Currencies | MMK per USD | Key |
| ---- | ---------- | ----------- | --- |
| `open.er-api.com` | 166 | **2,100.57** | none |
| `api.frankfurter.app` | 29 | **absent** (ECB) | none |

2,100 is the Central Bank of Myanmar official rate. A traveller pays roughly
double that or more. Publishing the official rate would show Burmese users —
the audience this app just added a language for — prices under half what they
will actually be charged. That is worse than showing dollars, so MMK is carried
as a manually-maintained rate instead.

## 3. Architecture

```
open.er-api.com ──(at most once a day, lazily)──► fx_rates (Neon)
                                                      │
                                        GET /api/rates │  (auth required)
                                                      ▼
                                            useRates()  ──► formatMoney()
                                          React Query cache      │
                                                                 ▼
                                                        TripDetailView
```

### 3.1 `fx_rates` table

```ts
export const fxRateSource = pgEnum("fx_rate_source", ["feed", "manual"]);

export const fxRates = pgTable("fx_rates", {
  currency: text("currency").primaryKey(),          // "EUR", "MMK", …
  ratePerUsd: numeric("rate_per_usd", { precision: 18, scale: 6 }).notNull(),
  source: fxRateSource("source").notNull().default("feed"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

USD is the base and is **not** stored — a row whose value must never change is a
row someone will eventually change. Code treats USD as identity.

`source` is the whole mechanism: the refresh writes `feed` rows only and never
touches `manual` ones. Making the kyat authoritative is setting one column.

### 3.2 `GET /api/rates`

Authenticated, like every other data route (`/api/destinations` returns a clean
401 signed out; this matches).

1. Read all rows.
2. If the newest `feed` row is older than 24h — or there are none — fetch
   `https://open.er-api.com/v6/latest/USD`, upsert the supported currencies
   where `source = 'feed'`, and re-read.
3. Respond:

```json
{ "base": "USD", "rates": { "EUR": 0.91, "MMK": 4500 }, "updatedAt": "2026-09-05T00:02:32Z" }
```

Only the **six non-USD** currencies in `CURRENCIES` are stored or returned — USD
is the base and is absent by design (§3.1). The payload is a few hundred bytes.

**Two requests can refresh at once.** The upsert is idempotent and the second
write is identical to the first, so the race is harmless and is not worth a lock.

**Subrequest budget.** Every `neon-http` query counts against Cloudflare's
per-request limit (`AGENTS.md`). This route costs one query on the common path
and one query plus one `fetch` on the once-a-day refresh.

### 3.3 Client

- `src/lib/rates.ts` — `useRates()`, a React Query hook. `staleTime` 12h (the
  feed moves once a day; the app-wide 30s default is wrong here). Returns `{}`
  on failure rather than throwing.
- `src/lib/money.ts` — `formatMoney(usd, currency, rates)`, a pure function.

## 4. Formatting and rounding

The input is an AI estimate of a price, not a price. `$50` at 4,500 is
`225,000 MMK`, not `224,981` — false precision reads as false authority.

- Values ≥ 1,000 round to 3 significant figures. 224,981 → 225,000.
- Values < 1,000 round to the nearest whole unit.
- No decimal places anywhere: the source is already whole dollars.
- `0` keeps rendering the existing "Free" translation, untouched.

**`Intl.NumberFormat` is the natural tool and must be verified before it is
relied on.** Hermes has historically shipped a reduced `Intl`, and on iOS it is
thinner than on Android. Verify on a real Android build (§8); if it is missing
or wrong, fall back to a small symbol-and-separator table. Android is the only
target that can be tested on this machine, so this is a genuine risk, not a
formality.

## 5. Failure behaviour

Every path degrades to dollars. **A wrong number is worse than an unconverted
one** — this is the whole reason the kyat is handled by hand.

| Situation | Behaviour |
| --------- | --------- |
| Rates request fails or is still loading | Show USD |
| The chosen currency has no row | Show USD |
| Upstream feed is down at refresh time | Serve the stored rates, however old |
| Upstream is down and the table is empty | Show USD |

A failed upstream refresh reports through `captureServerErrorOnce`
(`src/server/sentry.ts`), not `captureServerError`: a broken feed fails on every
request that triggers a refresh, and one report says everything. Tags carry the
HTTP status and the currency count — numbers and enums only, per `AGENTS.md`.

## 6. Budget

Two edits and a deletion.

- `src/app/generate.tsx:51` — `useState<Budget>("Mid-range")` becomes
  `useState<Budget>(preferences.budget)`.
- Collapse the four declarations of the same three values to one. `BUDGETS` and
  `Budget` stay in `src/data/generate.ts`; `src/lib/preferences.tsx` and
  `src/lib/trips.ts` import from there instead of redeclaring. The `budget_level`
  pgEnum stays as it is — it is the database's own type and cannot import from
  app code, but it must keep the same three values.

No migration, no server change. `coerce()` in `preferences.tsx` keeps validating
the stored value against the imported list, so its existing fallback behaviour
is unchanged.

## 7. Deliberately out of scope

- **The AI chat context stays in dollars** (`chat+api.ts:141`). Converting it
  would mean a Neon read on every chat turn, against the subrequest budget, to
  change numbers the assistant only mentions in passing. Worth revisiting if
  users ask the assistant about costs; not worth it now.
- **Trip-level totals.** No such display exists today; this adds none.
- **Currency per trip.** Explicitly rejected — the whole point of decision 1 is
  that one canonical stored unit lets old trips reprice.
- **A rate for every world currency.** Seven are offered; seven are stored.

## 8. Verification

There is no test framework in this project (`CLAUDE.md`), so this is manual plus
type and lint checks. `formatMoney` and the rounding rule are pure functions and
are exactly what unit tests are for — **that gap is real and is worth recording
rather than papering over.** Do not add a framework as a side effect of this
work.

Before deploying:

1. `npx tsc --noEmit` and `npm run lint` clean.
2. `npm run db:generate` → `npm run db:migrate` → `npm run db:check` shows the
   new migration applied to dev. Production migration only after that.
3. `curl` the deployed `/api/rates` with a token: 200, seven currencies, and an
   `updatedAt` within a day.

On an Android device:

4. Set currency to EUR — a trip that showed `$50` shows roughly `€46`.
5. Set it back to USD — the same trip shows `$50` again. **This is decision 1
   working**: an old trip repriced without being regenerated.
6. Set it to MMK — the number matches the hand-set rate, not 2,100.
7. Confirm the digits render rather than boxes, and that grouping separators
   appear. This is the `Intl` check from §4.
8. Set budget to Luxury, open Generate — Luxury is preselected, and can still be
   changed for that trip.

## 9. Release note

**The kyat rate must be set before this ships.** The migration seeds MMK as
`source = 'manual'` with whatever rate is current on the day it runs, and that
value is a judgement call, not a lookup. Update it later with
`npm run db:studio` (dev) or `npm run db:studio:prod` — one cell, live
immediately, no deploy. Add it to the pre-release checklist in `docs/RELEASE.md`,
because a stale hand-maintained rate has no alarm attached to it.

## 10. Files

**New** — `src/lib/rates.ts`, `src/lib/money.ts`, `src/app/api/rates+api.ts`,
one migration in `drizzle/`.

**Changed** — `src/server/db/schema.ts` (table + enum),
`src/components/trip/TripDetailView.tsx` (the one cost render),
`src/app/generate.tsx` (budget initial value),
`src/lib/preferences.tsx` and `src/lib/trips.ts` (import `BUDGETS` rather than
redeclare), `docs/RELEASE.md` (the kyat checklist item).

**Unchanged, deliberately** — `src/server/ai/gemini.ts` (the AI still quotes
dollars) and `src/app/api/chat+api.ts`.
