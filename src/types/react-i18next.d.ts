import type { en } from "@/lib/i18n/catalog-en";

// Makes t() key-safe. Without this, react-i18next types every key as `string`,
// so a typo or a key deleted from the catalog compiles fine and shows the raw
// key to the user at runtime. With it, `npx tsc --noEmit` fails instead —
// which is the point, since tsc and lint are this project's only gate.
declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
