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
    retry: "Retry",
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

  destinations: {
    title: "Popular destinations",
    countToExplore_one: "{{count}} destination to explore",
    countToExplore_other: "{{count}} destinations to explore",
    emptyTitle: "Nothing here yet",
    emptyBody: "Popular destinations will show up here soon.",
    loadFailed: "Couldn't load this destination.",
    notFound: "Couldn't find that destination.",
    goBack: "Go back",
    decreaseA11y: "Decrease value",
    increaseA11y: "Increase value",
    about: "About",
    generateTripTo: "Generate a trip to {{destination}}",
    viewOnUnsplashA11y: "View this photo on Unsplash",
  },

  generation: {
    loadingTitle: "Generating your trip",
    crafting: "Crafting your perfect itinerary…",
    craftingTime: "This usually takes 30-60 seconds.",
    step1: "Understanding your preferences",
    step2: "Generating itinerary with AI",
    step3: "Verifying places & locations",
    step4: "Finding the best images",
    step5: "Finalizing your trip",
    statusDone: "Done",
    statusInProgress: "In progress",
    statusPending: "Pending",
    didYouKnow: "Did you know?",
    didYouKnowBody:
      "We verify every place and optimize the route to give you the best experience.",
    // Keyed by trips.error_code. failureDefault covers both an unknown code
    // and a legacy row that has neither a code nor stored prose.
    failureAiRateLimited:
      "Our AI is busy right now (free-tier limit reached). Please wait a minute and try again.",
    failureGenerationFailed: "We couldn't build this itinerary. Please try again.",
    failureEnqueueFailed:
      "We couldn't start generating this trip. Please try again.",
    failureDefault: "We couldn't build this itinerary. Please try again.",
    errorHeader: "Trip not created",
    errorTitle: "Couldn't build this trip",
    backToHome: "Back to home",
    retryFailed: "Couldn't retry",
    deleteFailed: "Couldn't delete",
  },

  tripDetail: {
    day: "Day {{number}}",
    free: "Free",
    askAi: "Ask AI about this trip",
    askAiBody: "Tweaks, food, packing, local tips…",
    overview: "Overview",
    dailyItinerary: "Daily itinerary",
    tripMap: "Trip map",
    showingOnePlace: "Showing one place",
    verifiedPlaces_one: "{{count}} verified place",
    verifiedPlaces_other: "{{count}} verified places",
    showAllPlaces: "Show all places",
    attributionPlaces: "Places via OpenStreetMap",
    attributionPlacesPhotos: "Places via OpenStreetMap · Photos via Unsplash",
    deleteTripTitle: "Delete this trip?",
    deleteTripBody: "This permanently removes the trip and its itinerary.",
    photoPermission:
      "Allow photo access in your phone's settings to add a custom photo.",
    coverOpenFailed: "Couldn't open that photo. Please try again.",
    coverUploadFailed: "Couldn't upload that photo. Please try again.",
    coverSwitchFailed: "Couldn't switch photos. Please try again.",
  },

  errors: {
    unexpectedTitle: "Something went wrong",
    unexpectedBody: "We hit an unexpected error. Please try again.",
  },

  signUp: {
    heading: "Create your account",
    verifyHeading: "Verify your email",
    verifyBody: "We've sent a 6-digit code to",
    verifyEmail: "Verify email",
    fullName: "Full name",
    fullNamePlaceholder: "Jane Doe",
    passwordPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm password",
    confirmPlaceholder: "Re-enter your password",
    agreePrefix: "I agree to the ",
    agreeAnd: " and ",
    termsA11y: "Agree to the Terms of Service and Privacy Policy",
    submit: "Create account",
    submitting: "Creating account…",
    alreadyHaveAccount: "Already have an account?",
    fullNameRequired: "Full name is required.",
    fullNameTooShort: "Name must be at least 3 characters.",
    passwordTooShort: "Use at least 8 characters.",
    confirmRequired: "Please confirm your password.",
    passwordsDoNotMatch: "Passwords do not match.",
    termsRequired: "Please accept the Terms to continue.",
    couldNotCreate: "Could not create your account.",
    verificationFailed: "Verification failed. Please try again.",
  },

  // Home's "AI Inspirations" tiles, keyed by the ids in src/data/home.ts.
  // The \n is the deliberate two-line break inside each tile.
  inspirations: {
    food: "Food\nAdventures",
    nature: "Nature\nEscapes",
    culture: "Cultural\nJourneys",
    beach: "Beach\nRelaxation",
    night: "Vibrant\nNightlife",
  },

  // trips.time_of_day is a Postgres enum, so it is a fixed category the app
  // renders — not free text from the model.
  timeOfDay: {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
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
    continueWithGoogle: "Continue with Google",
    continueWithApple: "Continue with Apple",
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
