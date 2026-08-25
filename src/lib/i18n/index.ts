import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./catalog-en";
import { my } from "./catalog-my";

// An explicit instance rather than the default export. Same behaviour —
// initReactI18next registers it as the one useTranslation() reads — but it
// keeps member access off a default import, which lint flags.
const i18n = createInstance();

// One namespace ("translation", i18next's default) — with two languages and 16
// screens, namespaces would be filing for its own sake.
//
// The initial language is "en" and is corrected before the first frame:
// loadStoredPreferences() in src/lib/preferences.tsx reads the device's saved
// choice and calls changeLanguage() while the native splash is still up. Doing
// it here instead would mean an async read inside module scope.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    my: { translation: my },
  },
  lng: "en",
  fallbackLng: "en",
  // A key missing from Burmese renders the English string, never blank.
  returnNull: false,
  // React already escapes everything it renders; i18next doing it again would
  // turn an apostrophe into &#39; on screen.
  interpolation: { escapeValue: false },
});

// i18next's plural handling uses Intl.PluralRules. Hermes' Intl support varies
// by platform and version, and the failure mode is quiet — plurals silently
// resolve to the wrong form rather than throwing. So it is asserted out loud
// once at startup: if this ever warns, set `compatibilityJSON: "v3"` above and
// rewrite the plural keys in the v3 `_plural` style.
//
// Burmese has no grammatical plural, so this only affects English one/other.
if (__DEV__ && typeof Intl?.PluralRules !== "function") {
  console.warn(
    "[i18n] Intl.PluralRules is unavailable — plural keys will resolve incorrectly.",
  );
}

export default i18n;
