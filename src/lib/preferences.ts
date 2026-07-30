import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

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

  const update = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      // Fire-and-forget: the UI already reflects `next`, and a write failure
      // only means the choice is forgotten on the next launch.
      SecureStore.setItemAsync(STORE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { preferences, update };
}
