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

  welcome: {
    // "Triply" is the product name and is never translated.
    tagline: "AI travel trip-planner",
    headline: "Plan smarter trips\nwith AI, in seconds.",
    featureItinerariesTitle: "AI-powered itineraries",
    featureItinerariesSubtitle: "Personalized plans in seconds.",
    featureLocalTitle: "Smart local recommendations",
    featureLocalSubtitle: "Best places to eat, stay & explore.",
    featureTimeTitle: "Save time & travel better",
    featureTimeSubtitle: "Everything you need in one place.",
    signIn: "Sign in",
    newToTriply: "New to Triply?",
    signUp: "Sign up",
  },

  tabs: {
    home: "Home",
    assistant: "Assistant",
    trips: "Trips",
    profile: "Profile",
  },

  auth: {
    // Shared by sign-in and sign-up.
    email: "Email",
    emailPlaceholder: "jane.doe@example.com",
    password: "Password",
    passwordPlaceholder: "Your password",
    orContinueWith: "or continue with",
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Password is required.",
    didntReceiveCode: "Didn't receive the code?",
    sending: "Sending…",
    resendCode: "Resend code",
    resendFailed: "Could not resend the code.",
    codeFailed: "That code didn't work. Please try again.",
    verifying: "Verifying…",
  },

  signIn: {
    errorTitle: "Something went wrong",
    errorBody: "We couldn't sign you in. Please try again.",
    heading: "Welcome back",
    subheading: "Sign in to continue planning.",
    submit: "Sign in",
    submitting: "Signing in…",
    // Clerk's own error text is passed through untranslated — it is written by
    // their API, not by us. These are the fallbacks for when it says nothing.
    couldNotSignIn: "Could not sign in. Check your details and try again.",
    didNotComplete:
      "We couldn't finish signing you in. Please try again, or use Continue with Google.",
    codeNotComplete:
      "We couldn't finish signing you in. Please try Continue with Google.",
    confirmTitle: "Confirm it's you",
    confirmBody: "This is a new device, so we've sent a 6-digit code to",
    verifyAndSignIn: "Verify and sign in",
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
