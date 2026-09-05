import { eq, sql } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { fxRates } from "@/server/db/schema";
import { captureServerErrorOnce } from "@/server/sentry";

// GET /rates — exchange rates against USD, so the app can draw a cost stored in
// dollars in whatever currency the user picked on the Profile screen.
//
// Auth is required because every route in this app is signed-in-only, not
// because the data is user-scoped — these are the same rates for everybody.
//
// The currency list is duplicated here rather than imported from
// src/lib/preferences.tsx on purpose: that module pulls in expo-secure-store,
// which has no business in a Cloudflare Worker. Keep the two lists in step.
//
// MMK is absent from FEED_CURRENCIES and that is the entire point. open.er-api
// carries the kyat, but at the Central Bank official rate (~2,100/USD) — around
// half what a traveller actually pays. Publishing that would mislead precisely
// the users this app added Burmese for, so the kyat lives as a 'manual' row
// that this refresh never touches. See docs/RELEASE.md for setting it.
const FEED_CURRENCIES = ["EUR", "GBP", "JPY", "SGD", "THB"] as const;

const FEED_URL = "https://open.er-api.com/v6/latest/USD";
const FEED_TIMEOUT_MS = 5_000;
// The upstream feed publishes once a day, so refreshing more often would spend
// a Cloudflare subrequest to fetch a number that has not moved.
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

type RateRow = {
  currency: string;
  ratePerUsd: number;
  source: "feed" | "manual";
  updatedAt: Date;
};

function readRates(): Promise<RateRow[]> {
  return db
    .select({
      currency: fxRates.currency,
      ratePerUsd: fxRates.ratePerUsd,
      source: fxRates.source,
      updatedAt: fxRates.updatedAt,
    })
    .from(fxRates);
}

/**
 * True when the feed-sourced rows are missing or a day old.
 *
 * Only 'feed' rows are considered: the hand-maintained kyat row is never stale
 * in a way this code can fix, and letting it hold the refresh off would mean a
 * single manual edit froze every other currency.
 */
function needsRefresh(rows: RateRow[]): boolean {
  const fromFeed = rows.filter((r) => r.source === "feed");
  if (fromFeed.length === 0) return true;
  const newest = Math.max(...fromFeed.map((r) => r.updatedAt.getTime()));
  return Date.now() - newest > REFRESH_AFTER_MS;
}

/**
 * Pulls the feed and upserts the rates it covers. Never throws.
 *
 * A failure here is not a failure of the request: the caller falls back to
 * whatever is already stored, and the client falls back to dollars if that is
 * nothing. Reporting uses captureServerErrorOnce because a broken feed fails on
 * every request that triggers a refresh, and one report says everything.
 */
async function refreshFromFeed(): Promise<void> {
  // AbortController rather than AbortSignal.timeout, matching src/server/sentry.ts:
  // both exist on Workers, but this one has existed for longer.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(FEED_URL, { signal: controller.signal });
    if (!res.ok) {
      await captureServerErrorOnce(
        "fx_feed_http",
        new Error("Exchange-rate feed returned a non-OK status"),
        {
          failure_kind: "fx_feed_unavailable",
          route: "GET /api/rates",
          tags: { upstream_status: res.status },
        },
      );
      return;
    }

    const body = (await res.json()) as { rates?: Record<string, number> };
    const now = new Date();
    const values: {
      currency: string;
      ratePerUsd: number;
      source: "feed";
      updatedAt: Date;
    }[] = [];
    for (const currency of FEED_CURRENCIES) {
      const rate = body.rates?.[currency];
      // A zero or negative rate would silently price every activity at nothing,
      // so an absent or nonsensical value is skipped rather than stored. The
      // previous good value stays in the table and keeps being served.
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
        continue;
      }
      values.push({ currency, ratePerUsd: rate, source: "feed", updatedAt: now });
    }

    if (values.length === 0) {
      await captureServerErrorOnce(
        "fx_feed_empty",
        new Error("Exchange-rate feed carried none of the expected currencies"),
        {
          failure_kind: "fx_feed_empty",
          route: "GET /api/rates",
          tags: { expected_count: FEED_CURRENCIES.length },
        },
      );
      return;
    }

    await db
      .insert(fxRates)
      .values(values)
      .onConflictDoUpdate({
        target: fxRates.currency,
        set: { ratePerUsd: sql`excluded.rate_per_usd`, updatedAt: now },
        // Belt and braces. MMK is already outside FEED_CURRENCIES, but this
        // makes "a manual row is never overwritten" a property of the write
        // itself rather than of a list someone might later edit.
        setWhere: eq(fxRates.source, "feed"),
      });
  } catch (err) {
    await captureServerErrorOnce("fx_feed_fetch", err, {
      failure_kind: "fx_feed_unavailable",
      route: "GET /api/rates",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  try {
    let rows = await readRates();

    // Two requests arriving together can both refresh. The upsert is idempotent
    // and the second write is identical to the first, so the race costs one
    // wasted fetch a day at worst — cheaper than any lock would be.
    if (needsRefresh(rows)) {
      await refreshFromFeed();
      rows = await readRates();
    }

    const rates: Record<string, number> = {};
    for (const row of rows) rates[row.currency] = row.ratePerUsd;

    const updatedAt = rows.length
      ? new Date(Math.max(...rows.map((r) => r.updatedAt.getTime()))).toISOString()
      : null;

    // USD is absent by design — it is the base, and the client treats it as 1.
    return Response.json({ base: "USD", rates, updatedAt });
  } catch (err) {
    // Without this the query simply throws, the Worker returns an unhandled
    // 500, and nothing is reported — there is no Sentry SDK in this runtime, so
    // an uncaught error here is genuinely silent.
    //
    // That silence is the expensive part, because the app is *designed* to fall
    // back to dollars when it has no rates. A broken table and a currency that
    // simply has no row therefore look identical on the phone: prices in
    // dollars, no error, nothing to see. Exactly that happened on the day this
    // shipped — the fx_rates table had not been migrated, every request 500'd,
    // and the only symptom was "the currency setting does nothing".
    //
    // captureServerErrorOnce rather than captureServerError: a missing table or
    // a bad DATABASE_URL fails every request alike, so one report says
    // everything. Isolates recycle, so a still-broken deployment reports again
    // periodically instead of going quiet for good.
    await captureServerErrorOnce("fx_rates_read", err, {
      failure_kind: "fx_rates_unavailable",
      route: "GET /api/rates",
      status: 503,
    });

    // 503 rather than an empty 200. Both render dollars, because that is what
    // formatMoney does with no rate — but an empty 200 would claim the rates
    // are legitimately unavailable, and the client would cache that answer for
    // 12 hours. An error lets React Query retry.
    return Response.json({ error: "Exchange rates are unavailable" }, { status: 503 });
  }
}
