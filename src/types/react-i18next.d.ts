import type { en } from "@/lib/i18n/catalog-en";

// Makes t() key-safe. Without this, every key is typed `string`, so a typo or
// a key deleted from the catalog compiles fine and shows the raw key to the
// user at runtime. With it, `npx tsc --noEmit` fails instead — which is the
// point, since tsc and lint are this project's only gate.
//
// The augmented module is "i18next", NOT "react-i18next". Most guides still
// show the react-i18next form; it was correct for older versions and is
// silently inert now — react-i18next re-exports i18next's CustomTypeOptions,
// so augmenting the wrapper changes nothing. This was caught by deleting a key
// from the catalog and watching tsc stay green, then by calling
// t("common.thisKeyDoesNotExist") and watching it compile. If either of those
// ever passes again, this declaration has stopped working.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
