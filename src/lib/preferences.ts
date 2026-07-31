import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

// Travel preferences shown on the Profile screen. These live on the device
// only — there is no user_preferences table yet, so nothing here is sent to
// the server. When one is added, swap the read/write below for the API and the
// screen keeps working unchanged.
//
// expo-secure-store is used because it is the one storage module already in
// the native build (it backs the Clerk token cache). These values are not
// secrets; the keychain is just a convenient place to put them.

export const LANGUAGES = ["English", "Español", "Français", "Deutsch", "日本語"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "MMK", "SGD", "THB"] as const;
export const BUDGETS = ["Budget", "Mid-range", "Luxury"] as const;

export type Language = (typeof LANGUAGES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type Budget = (typeof BUDGETS)[number];

export type Preferences = {
  language: Language;
  currency: Currency;
  budget: Budget;
};

// Matches the values shown in design/profile-screen.png.
export const DEFAULT_PREFERENCES: Preferences = {
  language: "English",
  currency: "USD",
  budget: "Mid-range",
};

const STORE_KEY = "triply.preferences.v1";

// Writes are chained rather than fired off independently: two quick taps would
// otherwise race, and whichever request happened to finish last would win. The
// queue is module-level so every caller of usePreferences shares it — they all
// write the same key. A failed write only costs the choice on the next launch,
// so it is swallowed and the chain stays alive for the next one.
let writeQueue: Promise<unknown> = Promise.resolve();

function persist(next: Preferences) {
  writeQueue = writeQueue
    .then(() => SecureStore.setItemAsync(STORE_KEY, JSON.stringify(next)))
    .catch(() => {});
}

/**
 * Forgets the stored preferences. Called when an account is deleted, so the
 * next person to sign in on this device does not inherit its choices. Goes
 * through the same queue as the writes, so a pending write cannot land after
 * the delete and resurrect the values.
 */
export function clearPreferences(): Promise<void> {
  const done = writeQueue
    .then(() => SecureStore.deleteItemAsync(STORE_KEY))
    .catch(() => {});
  writeQueue = done;
  return done;
}

// A stored value is only trusted if it is still one of the options above — an
// older build could have written a choice that no longer exists.
function coerce(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      language: LANGUAGES.includes(parsed.language as Language)
        ? (parsed.language as Language)
        : DEFAULT_PREFERENCES.language,
      currency: CURRENCIES.includes(parsed.currency as Currency)
        ? (parsed.currency as Currency)
        : DEFAULT_PREFERENCES.currency,
      budget: BUDGETS.includes(parsed.budget as Budget)
        ? (parsed.budget as Budget)
        : DEFAULT_PREFERENCES.budget,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Reads the saved preferences once on mount and writes each change straight
 * back to the device. Renders the defaults until the read resolves, so the rows
 * never show empty values.
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORE_KEY)
      .then((raw) => {
        if (active) setPreferences(coerce(raw));
      })
      // A failed read is not worth surfacing — the defaults are already shown.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      persist(next);
      return next;
    });
  };

  return { preferences, update };
}
