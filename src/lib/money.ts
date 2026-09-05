import type { Currency } from "@/lib/preferences";
import type { Rates } from "@/lib/rates";

// Costs are stored in USD (activities.est_cost_usd) and converted here, at the
// moment they are drawn. That is what lets changing the Currency preference
// reprice trips the user already has — a currency captured per trip could not.

// Symbol and, just as importantly, which side of the number it goes on.
//
// The kyat is written after the amount — "1,800 Ks", not "K1,800". Treating
// every currency as a prefix because the dollar is one produces something a
// Burmese reader immediately clocks as wrong, which rather undoes the point of
// offering their currency at all.
const FORMATS: Record<Currency, { symbol: string; suffix?: true }> = {
  USD: { symbol: "$" },
  EUR: { symbol: "€" },
  GBP: { symbol: "£" },
  JPY: { symbol: "¥" },
  MMK: { symbol: "Ks", suffix: true },
  SGD: { symbol: "S$" },
  THB: { symbol: "฿" },
};

function withSymbol(amount: number, currency: Currency): string {
  const { symbol, suffix } = FORMATS[currency];
  const digits = group(amount);
  return suffix ? `${digits} ${symbol}` : `${symbol}${digits}`;
}

/**
 * Rounds a converted amount to something honest.
 *
 * The input is an AI's guess at a price, not a price. $50 at 4,500 is "about
 * 225,000 kyat", and printing 224,981 would dress a guess up as a quotation —
 * the digits imply a precision that was never there. So anything in the
 * thousands keeps three significant figures and the rest becomes zeroes.
 */
function roundForDisplay(amount: number): number {
  if (amount < 1000) return Math.round(amount);
  const magnitude = 10 ** (Math.floor(Math.log10(amount)) - 2);
  return Math.round(amount / magnitude) * magnitude;
}

/**
 * Groups digits in threes: 225000 -> "225,000".
 *
 * Hand-rolled rather than `Intl.NumberFormat`, for two reasons. Hermes has
 * historically shipped a reduced `Intl` and it differs between Android and iOS,
 * so relying on it means the number formatting is engine-dependent — a bad
 * property for the one string in the app that must never be wrong. And a
 * locale-aware formatter would switch separators with the app language, so the
 * same price would read differently in Burmese than in English for no reason
 * the user asked for.
 */
function group(whole: number): string {
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Renders a USD cost in the user's chosen currency.
 *
 * Falls back to dollars whenever the conversion cannot be trusted — rates still
 * loading, the request failed, or this currency has no row (which is the normal
 * state of MMK until its rate is set by hand). **An unconverted price is always
 * better than a wrong one**, which is the whole reason the kyat is maintained
 * manually rather than taken from the feed.
 */
export function formatMoney(
  usd: number,
  currency: Currency,
  rates: Rates | undefined,
): string {
  // Dollars are never put through roundForDisplay. That rounding exists to hide
  // precision *invented by the conversion*, and an unconverted amount has none
  // to hide — it is the number the model actually gave. Rounding it anyway
  // turned $1,234 into $1,230, which is a worse answer, not a humbler one.
  const dollars = withSymbol(Math.round(Math.abs(usd)), "USD");
  if (currency === "USD") return dollars;

  const rate = rates?.[currency];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return dollars;
  }

  return withSymbol(roundForDisplay(Math.abs(usd) * rate), currency);
}
