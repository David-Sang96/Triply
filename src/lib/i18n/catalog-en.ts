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

  home: {
    // "Triply" is the product name and stays untranslated.
    greetingFallback: "there",
    yourTrips: "Your trips",
    popularDestinations: "Popular destinations",
    aiInspirations: "AI Inspirations",
    seeAll: "See all",
    tripsLoadError: "Couldn't load your trips",
    destinationsLoadError: "Couldn't load destinations",
    tapToTryAgain: "Tap to try again.",
    noTripsYet: "No trips yet",
    noTripsBody: "Tap to generate your first AI trip plan.",
  },

  trip: {
    // i18next plural keys: it picks _one/_other from `count` via
    // Intl.PluralRules. Burmese has no grammatical plural, so its catalog
    // gives both forms the same string — that is correct, not a copy-paste slip.
    days_one: "{{count}} day",
    days_other: "{{count}} days",
    travelers_one: "{{count}} traveler",
    travelers_other: "{{count}} travelers",
    generating: "Generating…",
    failed: "Failed",
    heroFallbackTitle: "Ready for your\nnext adventure?",
    heroFallbackSubtitle: "Let AI plan your next trip.",
    generateATrip: "Generate a trip",
    hello: "Hello, {{name}}",
  },

  trips: {
    title: "My Trips",
    count_one: "{{count}} trip",
    count_other: "{{count}} trips",
    emptyTitle: "No trips yet",
    emptyBody: "Your planned and saved trips will show up here.",
  },

  generate: {
    headerTitle: "Generate a trip",
    intro: "Let's plan your perfect trip",
    introBody:
      "Tell us a few details and our AI will generate the best itinerary for you.",
    whereLabel: "Where do you want to go?",
    wherePlaceholder: "Search destination",
    whereRequired: "Please enter where you want to go.",
    daysLabel: "How many days?",
    daysHelper: "1 - 7 days",
    travelersLabel: "How many travelers?",
    travelersHelper: "1 - 10 travelers",
    budgetLabel: "Budget level",
    interestsLabel: "What are you interested in?",
    interestsHint: "(Select up to {{max}})",
    paceLabel: "Travel Pace",
    submit: "Generate trip",
    submitting: "Starting...",
    noPayment: "No payment required",
    startFailedTitle: "Couldn't start your trip",
  },

  // Keyed by the ids in src/data/generate.ts. The `label` there stays English
  // and is what gets SENT to the server for the Gemini prompt; these are only
  // what the user sees, so translating them cannot change generation.
  interests: {
    food: "Food",
    history: "History",
    nature: "Nature",
    nightlife: "Nightlife",
    adventure: "Adventure",
    culture: "Culture",
    shopping: "Shopping",
    relaxation: "Relaxation",
  },

  paces: {
    relaxedLabel: "Relaxed",
    relaxedDescription: "Fewer stops, more downtime",
    balancedLabel: "Balanced",
    balancedDescription: "A comfortable mix each day",
    fastLabel: "Fast-paced",
    fastDescription: "See as much as you can",
  },

  assistant: {
    title: "Assistant",
    newChat: "New chat",
    loadError: "Couldn't load your chats",
    emptyTitle: "No conversations yet",
    emptyBody: "Ask me anything about planning your next trip.",
    startChatting: "Start chatting",
    deleteConversationTitle: "Delete this conversation?",
    deleteConversationBody:
      "This permanently removes the conversation and its messages.",
    deleteConversationA11y: "Delete conversation",
    deleteFailed: "Couldn't delete",
    pleaseTryAgain: "Please try again.",
  },

  chat: {
    // "Triply" is the product name and stays untranslated.
    headerTitle: "Triply Assistant",
    subtitleTrip: "About your trip",
    subtitleGeneral: "Your travel helper",
    greetingTrip:
      "Hi! I'm your Triply assistant. Ask me anything about your {{destination}} — tweaks, food, packing, or local tips.",
    greetingTripFallback: "trip",
    greeting:
      "Hi! I'm your Triply travel assistant. Ask me anything about planning a trip.",
    inputPlaceholder: "Ask about your trip…",
    sendA11y: "Send message",
    backA11y: "Go back",
    replyFailed: "Couldn't get a reply.",
    deleteMessageTitle: "Delete this message?",
    deleteMessageBody: "This removes both your question and the reply.",
  },

  // Relative timestamps on the conversation list.
  time: {
    justNow: "Just now",
    minutesAgo: "{{count}}m ago",
    hoursAgo: "{{count}}h ago",
    daysAgo: "{{count}}d ago",
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
