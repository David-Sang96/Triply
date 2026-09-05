import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { BUDGETS, type Budget } from "@/data/generate";
import i18n from "@/lib/i18n";

// Travel preferences shown on the Profile screen. These live on the device
// only — there is no user_preferences table yet, so nothing here is sent to
// the server. When one is added, swap the read/write below for the API and the
// screen keeps working unchanged.
//
// expo-secure-store is used because it is the one storage module already in
// the native build (it backs the Clerk token cache). These values are not
// secrets; the keychain is just a convenient place to put them.
//
// Language is a CODE ("en"/"my"), not a display name, so the stored value never
// has to be parsed back into one. The five-option list this replaced
// (English/Español/Français/Deutsch/日本語) was decorative — nothing consumed
// it — so the removed options are handled by coerce() falling back to the
// default, which it already did for any unrecognised value.

// BUDGETS is imported rather than declared here. The same three values used to
// be written out in four places — this file, src/data/generate.ts,
// src/lib/trips.ts, and the budget_level pgEnum — which is three chances for
// them to drift apart. src/data/generate.ts owns the list because that is where
// the Generate form reads it; the pgEnum is the database's own type and cannot
// import app code, so it stays separate and must keep the same three values.
export const LANGUAGES = ["en", "my"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "MMK", "SGD", "THB"] as const;

export type Language = (typeof LANGUAGES)[number];
export type Currency = (typeof CURRENCIES)[number];

/** What the picker shows. Each language is named in its own language. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  my: "မြန်မာ",
};

export type Preferences = {
  language: Language;
  currency: Currency;
  budget: Budget;
};

// Matches the values shown in design/profile-screen.png.
export const DEFAULT_PREFERENCES: Preferences = {
  language: "en",
  currency: "USD",
  budget: "Mid-range",
};

const STORE_KEY = "triply.preferences.v1";

// Writes are chained rather than fired off independently: two quick taps would
// otherwise race, and whichever request happened to finish last would win. The
// queue is module-level so every caller shares it — they all write the same
// key. A failed write only costs the choice on the next launch, so it is
// swallowed and the chain stays alive for the next one.
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
// older build could have written a choice that no longer exists. That is
// exactly what happens to anyone who had picked Español, Français, Deutsch or
// 日本語 before those were removed: they fall back to English.
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
 * Reads the stored preferences once, before anything renders. Called from the
 * splash gate in _layout so the first painted frame is already in the right
 * language — otherwise Burmese users would see a frame of English.
 */
export async function loadStoredPreferences(): Promise<Preferences> {
  try {
    const prefs = coerce(await SecureStore.getItemAsync(STORE_KEY));
    await i18n.changeLanguage(prefs.language);
    return prefs;
    // A failed read is not worth surfacing — the defaults are usable.
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

type Store = {
  preferences: Preferences;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<Store | null>(null);

/**
 * Holds the preferences for the whole app.
 *
 * This is a Context rather than a plain hook because language is now read in
 * many places at once. The previous version kept its own useState per caller,
 * so two components would have held two independent copies and a change in one
 * would not have reached the other — invisible while Profile was the only
 * caller, and wrong the moment it stopped being.
 */
export function PreferencesProvider({
  initial,
  children,
}: {
  initial: Preferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<Preferences>(initial);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      persist(next);
      return next;
    });
  };

  // i18next holds the active language outside React, so it is synced here
  // rather than inside update() — that way it is also correct if the value
  // ever changes by another route (a restore, a future server sync).
  useEffect(() => {
    if (i18n.language !== preferences.language) {
      i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language]);

  return (
    <PreferencesContext.Provider value={{ preferences, update }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Store {
  const store = useContext(PreferencesContext);
  if (!store) {
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  }
  return store;
}

/**
 * Just the active language. Separate from usePreferences because <Text> calls
 * it on every render and has no business knowing about currency or budget.
 */
export function useLanguage(): Language {
  return usePreferences().preferences.language;
}
