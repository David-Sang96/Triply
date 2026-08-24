// The English catalog is the source of truth for the key list: the type
// declaration in src/types/react-i18next.d.ts points at it, so a key that is
// missing or misspelled at a call site fails `npx tsc --noEmit`. That matters
// more here than in most projects — tsc and lint are the only automated gate.
//
// Keys are grouped by screen, dot-separated. Add the English string first,
// then the Burmese one in catalog-my.ts; a key present here and absent there
// falls back to English rather than rendering blank.

export const en = {
  common: {
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    tryAgain: "Try again",
    somethingWentWrong: "Something went wrong. Please try again.",
  },

  profile: {
    title: "Profile",
    fallbackName: "traveler",

    preferences: "Preferences",
    language: "Language",
    currency: "Currency",
    travelBudget: "Travel Budget",

    support: "Support",
    helpCenter: "Help Center",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    aboutTriply: "About Triply",

    account: "Account",
    signOut: "Sign Out",
    deleteAccount: "Delete Account",
    deleting: "Deleting…",

    deleteConfirmTitle: "Delete your account?",
    deleteConfirmBody:
      "This permanently removes your trips, chats and saved preferences. It cannot be undone.",
    deleteFailedTitle: "Couldn't delete your account",
  },

  budget: {
    Budget: "Budget",
    "Mid-range": "Mid-range",
    Luxury: "Luxury",
  },
} as const;
