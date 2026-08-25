import type { en } from "./catalog-en";

// Burmese (Unicode, not Zawgyi). Typed against the English catalog so a key
// that is renamed or removed there fails the build here rather than silently
// falling back to English forever.
//
// Leaves widen to `string`: the English catalog is `as const`, so without this
// every value would have to equal the English literal — the type would demand
// that the Burmese for "Cancel" be the string "Cancel". Keys stay checked,
// which is the part worth having. Values are optional so a key still being
// translated falls back to English rather than rendering blank.

type Catalog<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? Catalog<T[K]> : string;
};

export const my: Catalog<typeof en> = {
  common: {
    cancel: "မလုပ်တော့ပါ",
    delete: "ဖျက်မည်",
    close: "ပိတ်မည်",
    retry: "ထပ်စမ်းရန်",
    tryAgain: "ထပ်စမ်းကြည့်ပါ",
    somethingWentWrong: "တစ်ခုခုမှားယွင်းသွားပါသည်။ ထပ်စမ်းကြည့်ပါ။",
  },

  welcome: {
    tagline: "AI ခရီးစဉ်စီစဉ်ပေးသူ",
    headline: "AI ဖြင့် ပိုမိုဉာဏ်ရှိသော\nခရီးစဉ်များကို စက္ကန့်ပိုင်းအတွင်း",
    featureItinerariesTitle: "AI ဖြင့်ရေးဆွဲသော ခရီးစဉ်များ",
    featureItinerariesSubtitle: "သင့်အတွက်သီးသန့် အစီအစဉ်များ စက္ကန့်ပိုင်းအတွင်း",
    featureLocalTitle: "ဒေသတွင်း အကြံပြုချက်များ",
    featureLocalSubtitle: "စားရန်၊ တည်းရန်နှင့် လည်ပတ်ရန် အကောင်းဆုံးနေရာများ",
    featureTimeTitle: "အချိန်ကုန်သက်သာပြီး ပိုကောင်းသော ခရီး",
    featureTimeSubtitle: "လိုအပ်သမျှ တစ်နေရာတည်းတွင်",
    signIn: "ဝင်မည်",
    newToTriply: "Triply ကို အသစ်လား။",
    signUp: "အကောင့်ဖွင့်မည်",
  },

  home: {
    greetingFallback: "မိတ်ဆွေ",
    yourTrips: "သင့်ခရီးစဉ်များ",
    popularDestinations: "ရေပန်းစားသော ခရီးစဉ်နေရာများ",
    aiInspirations: "AI အကြံပြုချက်များ",
    seeAll: "အားလုံးကြည့်ရန်",
    tripsLoadError: "ခရီးစဉ်များ ဖတ်၍မရပါ",
    destinationsLoadError: "နေရာများ ဖတ်၍မရပါ",
    tapToTryAgain: "ထပ်စမ်းရန် နှိပ်ပါ။",
    noTripsYet: "ခရီးစဉ် မရှိသေးပါ",
    noTripsBody: "ပထမဆုံး AI ခရီးစဉ်ကို ဖန်တီးရန် နှိပ်ပါ။",
  },

  trip: {
    days_one: "{{count}} ရက်",
    days_other: "{{count}} ရက်",
    travelers_one: "ခရီးသွား {{count}} ဦး",
    travelers_other: "ခရီးသွား {{count}} ဦး",
    generating: "ဖန်တီးနေသည်…",
    failed: "မအောင်မြင်ပါ",
    heroFallbackTitle: "နောက်ခရီးစဉ်အတွက်\nအဆင်သင့်ဖြစ်ပြီလား။",
    heroFallbackSubtitle: "AI ဖြင့် နောက်ခရီးစဉ်ကို စီစဉ်လိုက်ပါ။",
    generateATrip: "ခရီးစဉ်ဖန်တီးမည်",
    hello: "မင်္ဂလာပါ {{name}}",
  },

  trips: {
    title: "ကျွန်ုပ်၏ ခရီးစဉ်များ",
    count_one: "ခရီးစဉ် {{count}} ခု",
    count_other: "ခရီးစဉ် {{count}} ခု",
    emptyTitle: "ခရီးစဉ် မရှိသေးပါ",
    emptyBody: "စီစဉ်ထားသော ခရီးစဉ်များ ဤနေရာတွင် ပေါ်လာပါမည်။",
  },

  generate: {
    headerTitle: "ခရီးစဉ်ဖန်တီးမည်",
    intro: "သင့်အတွက် အကောင်းဆုံးခရီးစဉ်ကို စီစဉ်ကြမည်",
    introBody:
      "အချက်အလက်အနည်းငယ် ဖြည့်ပေးပါ။ AI မှ အကောင်းဆုံးခရီးစဉ်ကို ဖန်တီးပေးပါမည်။",
    whereLabel: "ဘယ်ကိုသွားချင်ပါသလဲ။",
    wherePlaceholder: "နေရာရှာရန်",
    whereRequired: "သွားလိုသောနေရာကို ထည့်ပါ။",
    daysLabel: "ဘယ်နှစ်ရက်ကြာမလဲ။",
    daysHelper: "၁ - ၇ ရက်",
    travelersLabel: "ခရီးသွား ဘယ်နှစ်ဦးလဲ။",
    travelersHelper: "၁ - ၁၀ ဦး",
    budgetLabel: "ခရီးစရိတ်အဆင့်",
    interestsLabel: "ဘာတွေကို စိတ်ဝင်စားပါသလဲ။",
    interestsHint: "({{max}} ခုအထိ ရွေးနိုင်သည်)",
    paceLabel: "ခရီးသွားနှုန်း",
    submit: "ခရီးစဉ်ဖန်တီးမည်",
    submitting: "စတင်နေသည်…",
    noPayment: "ငွေပေးချေရန် မလိုပါ",
    startFailedTitle: "ခရီးစဉ် မစတင်နိုင်ပါ",
  },

  interests: {
    food: "အစားအသောက်",
    history: "သမိုင်း",
    nature: "သဘာဝ",
    nightlife: "ညဘဝ",
    adventure: "စွန့်စားခန်း",
    culture: "ယဉ်ကျေးမှု",
    shopping: "ဈေးဝယ်",
    relaxation: "အပန်းဖြေ",
  },

  paces: {
    relaxedLabel: "အေးဆေး",
    relaxedDescription: "ရပ်နားချိန်များပြီး နေရာနည်းနည်း",
    balancedLabel: "မျှတ",
    balancedDescription: "နေ့စဉ် သင့်တင့်သောအစီအစဉ်",
    fastLabel: "မြန်ဆန်",
    fastDescription: "တတ်နိုင်သမျှ များများကြည့်ရန်",
  },

  assistant: {
    title: "အကူအညီပေးသူ",
    newChat: "စကားပြောအသစ်",
    loadError: "စကားပြောများ ဖတ်၍မရပါ",
    emptyTitle: "စကားပြော မရှိသေးပါ",
    emptyBody: "နောက်ခရီးစဉ်အကြောင်း ဘာမဆို မေးနိုင်ပါသည်။",
    startChatting: "စတင်မေးမြန်းရန်",
    deleteConversationTitle: "ဤစကားပြောကို ဖျက်မှာလား။",
    deleteConversationBody: "စကားပြောနှင့် မက်ဆေ့ချ်များကို အပြီးအပိုင် ဖျက်ပါမည်။",
    deleteConversationA11y: "စကားပြောကို ဖျက်ရန်",
    deleteFailed: "ဖျက်၍မရပါ",
    pleaseTryAgain: "ထပ်စမ်းကြည့်ပါ။",
  },

  chat: {
    headerTitle: "Triply အကူအညီပေးသူ",
    subtitleTrip: "သင့်ခရီးစဉ်အကြောင်း",
    subtitleGeneral: "သင့်ခရီးသွားအကူ",
    greetingTrip:
      "မင်္ဂလာပါ။ ကျွန်ုပ်သည် Triply အကူဖြစ်ပါသည်။ {{destination}} အကြောင်း ဘာမဆိုမေးပါ — ပြင်ဆင်ချက်၊ အစားအသောက်၊ ပစ္စည်းထုပ်ခြင်း သို့မဟုတ် ဒေသဆိုင်ရာ အကြံပြုချက်များ။",
    greetingTripFallback: "ခရီးစဉ်",
    greeting:
      "မင်္ဂလာပါ။ ကျွန်ုပ်သည် Triply ခရီးသွားအကူဖြစ်ပါသည်။ ခရီးစဉ်စီစဉ်ခြင်းအကြောင်း ဘာမဆိုမေးပါ။",
    inputPlaceholder: "ခရီးစဉ်အကြောင်း မေးပါ…",
    sendA11y: "မက်ဆေ့ချ် ပို့ရန်",
    backA11y: "နောက်သို့",
    replyFailed: "အဖြေ မရရှိပါ။",
    deleteMessageTitle: "ဤမက်ဆေ့ချ်ကို ဖျက်မှာလား။",
    deleteMessageBody: "သင့်မေးခွန်းနှင့် အဖြေ နှစ်ခုလုံးကို ဖျက်ပါမည်။",
  },

  time: {
    justNow: "ခုနလေးတင်",
    minutesAgo: "{{count}} မိနစ်က",
    hoursAgo: "{{count}} နာရီက",
    daysAgo: "{{count}} ရက်က",
  },

  destinations: {
    title: "ရေပန်းစားသော နေရာများ",
    emptyTitle: "ဤနေရာတွင် မရှိသေးပါ",
    emptyBody: "ရေပန်းစားသော နေရာများ မကြာမီ ပေါ်လာပါမည်။",
    loadFailed: "ဤနေရာကို ဖတ်၍မရပါ။",
    notFound: "ထိုနေရာကို ရှာမတွေ့ပါ။",
    goBack: "နောက်သို့",
    decreaseA11y: "လျှော့ရန်",
    increaseA11y: "တိုးရန်",
    about: "အကြောင်း",
    generateTripTo: "{{destination}} သို့ ခရီးစဉ်ဖန်တီးမည်",
    viewOnUnsplashA11y: "ဤဓာတ်ပုံကို Unsplash တွင်ကြည့်ရန်",
  },

  generation: {
    loadingTitle: "ခရီးစဉ် ဖန်တီးနေသည်",
    step1: "သင့်စိတ်ကြိုက်များကို နားလည်နေသည်",
    step2: "AI ဖြင့် ခရီးစဉ်ရေးဆွဲနေသည်",
    step3: "နေရာများကို စစ်ဆေးနေသည်",
    step4: "ဓာတ်ပုံများ ရှာဖွေနေသည်",
    step5: "ခရီးစဉ်ကို အပြီးသတ်နေသည်",
    statusDone: "ပြီးပါပြီ",
    statusInProgress: "လုပ်ဆောင်နေသည်",
    statusPending: "စောင့်ဆိုင်းဆဲ",
    didYouKnow: "သိပါသလား။",
    didYouKnowBody:
      "နေရာတိုင်းကို စစ်ဆေးပြီး လမ်းကြောင်းကို အကောင်းဆုံးဖြစ်အောင် စီစဉ်ပေးပါသည်။",
    failureAiRateLimited:
      "AI သည် ယခုအလုပ်များနေပါသည် (အခမဲ့ကန့်သတ်ချက် ပြည့်သွားပါပြီ)။ တစ်မိနစ်ခန့်စောင့်ပြီး ထပ်စမ်းကြည့်ပါ။",
    failureGenerationFailed: "ဤခရီးစဉ်ကို မဖန်တီးနိုင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
    failureEnqueueFailed: "ခရီးစဉ်ဖန်တီးခြင်း မစတင်နိုင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
    failureDefault: "ဤခရီးစဉ်ကို မဖန်တီးနိုင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
    errorHeader: "ခရီးစဉ် မဖန်တီးနိုင်ပါ",
    errorTitle: "ဤခရီးစဉ်ကို မဖန်တီးနိုင်ပါ",
    backToHome: "ပင်မသို့ ပြန်သွားရန်",
    retryFailed: "ထပ်မံမကြိုးစားနိုင်ပါ",
    deleteFailed: "ဖျက်၍မရပါ",
  },

  tripDetail: {
    day: "ရက် {{number}}",
    free: "အခမဲ့",
    askAi: "ဤခရီးစဉ်အကြောင်း AI ကိုမေးရန်",
    askAiBody: "ပြင်ဆင်ချက်၊ အစားအသောက်၊ ပစ္စည်းထုပ်ခြင်း၊ ဒေသအကြံပြုချက်…",
    overview: "အနှစ်ချုပ်",
    tripMap: "ခရီးစဉ်မြေပုံ",
    showingOnePlace: "နေရာတစ်ခု ပြသနေသည်",
    verifiedPlaces_one: "စစ်ဆေးပြီး နေရာ {{count}} ခု",
    verifiedPlaces_other: "စစ်ဆေးပြီး နေရာ {{count}} ခု",
    showAllPlaces: "နေရာအားလုံး ပြရန်",
    attributionPlaces: "နေရာအချက်အလက် OpenStreetMap မှ",
    attributionPlacesPhotos:
      "နေရာအချက်အလက် OpenStreetMap မှ · ဓာတ်ပုံများ Unsplash မှ",
    deleteTripTitle: "ဤခရီးစဉ်ကို ဖျက်မှာလား။",
    deleteTripBody: "ခရီးစဉ်နှင့် အစီအစဉ်ကို အပြီးအပိုင် ဖျက်ပါမည်။",
    photoPermission:
      "ကိုယ်ပိုင်ဓာတ်ပုံထည့်ရန် ဖုန်းဆက်တင်တွင် ဓာတ်ပုံခွင့်ပြုချက် ပေးပါ။",
    coverOpenFailed: "ထိုဓာတ်ပုံကို မဖွင့်နိုင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
    coverUploadFailed: "ထိုဓာတ်ပုံကို မတင်နိုင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
    coverSwitchFailed: "ဓာတ်ပုံ မပြောင်းနိုင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
  },

  errors: {
    unexpectedTitle: "တစ်ခုခုမှားယွင်းသွားပါသည်",
    unexpectedBody: "မမျှော်လင့်သော အမှားဖြစ်ပွားပါသည်။ ထပ်စမ်းကြည့်ပါ။",
  },

  signUp: {
    heading: "အကောင့်အသစ် ဖွင့်ရန်",
    verifyHeading: "အီးမေးလ် အတည်ပြုပါ",
    verifyBody: "ဂဏန်း ၆ လုံးကုဒ်ကို ပို့ထားပါသည်",
    verifyEmail: "အီးမေးလ် အတည်ပြုမည်",
    fullName: "အမည်အပြည့်အစုံ",
    fullNamePlaceholder: "ဦးဘဘ",
    passwordPlaceholder: "အနည်းဆုံး ၈ လုံး",
    confirmPassword: "စကားဝှက် အတည်ပြုပါ",
    confirmPlaceholder: "စကားဝှက် ထပ်ရိုက်ပါ",
    agreePrefix: "ကျွန်ုပ်သဘောတူသည် ",
    agreeAnd: " နှင့် ",
    termsA11y: "ဝန်ဆောင်မှုစည်းကမ်းနှင့် ကိုယ်ရေးမူဝါဒကို သဘောတူရန်",
    submit: "အကောင့်ဖွင့်မည်",
    submitting: "အကောင့်ဖွင့်နေသည်…",
    alreadyHaveAccount: "အကောင့်ရှိပြီးသားလား။",
    fullNameRequired: "အမည် ထည့်ရန်လိုအပ်သည်။",
    fullNameTooShort: "အမည်သည် အနည်းဆုံး ၃ လုံး ရှိရမည်။",
    passwordTooShort: "အနည်းဆုံး ၈ လုံး အသုံးပြုပါ။",
    confirmRequired: "စကားဝှက်ကို အတည်ပြုပါ။",
    passwordsDoNotMatch: "စကားဝှက်များ မတူညီပါ။",
    termsRequired: "ဆက်လက်ရန် စည်းကမ်းများကို လက်ခံပါ။",
    couldNotCreate: "အကောင့် မဖွင့်နိုင်ပါ။",
    verificationFailed: "အတည်ပြုခြင်း မအောင်မြင်ပါ။ ထပ်စမ်းကြည့်ပါ။",
  },

  inspirations: {
    food: "အစားအသောက်\nခရီးစဉ်",
    nature: "သဘာဝ\nအပန်းဖြေ",
    culture: "ယဉ်ကျေးမှု\nခရီးစဉ်",
    beach: "ကမ်းခြေ\nအနားယူ",
    night: "ညဘဝ\nသက်ဝင်",
  },

  tabs: {
    home: "ပင်မ",
    assistant: "အကူ",
    trips: "ခရီးစဉ်",
    profile: "ကိုယ်ရေး",
  },

  auth: {
    email: "အီးမေးလ်",
    emailPlaceholder: "jane.doe@example.com",
    password: "စကားဝှက်",
    passwordPlaceholder: "သင့်စကားဝှက်",
    continueWithGoogle: "Google ဖြင့် ဆက်လက်ရန်",
    continueWithApple: "Apple ဖြင့် ဆက်လက်ရန်",
    orContinueWith: "သို့မဟုတ် ဆက်လက်ရန်",
    emailRequired: "အီးမေးလ် ထည့်ရန်လိုအပ်သည်။",
    emailInvalid: "မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်ပါ။",
    passwordRequired: "စကားဝှက် ထည့်ရန်လိုအပ်သည်။",
    didntReceiveCode: "ကုဒ်မရရှိပါသလား။",
    sending: "ပို့နေသည်…",
    resendCode: "ကုဒ်ပြန်ပို့မည်",
    resendFailed: "ကုဒ်ပြန်မပို့နိုင်ပါ။",
    codeFailed: "ကုဒ်မမှန်ပါ။ ထပ်စမ်းကြည့်ပါ။",
    verifying: "စစ်ဆေးနေသည်…",
  },

  signIn: {
    errorTitle: "တစ်ခုခုမှားယွင်းသွားပါသည်",
    errorBody: "အကောင့်ဝင်၍မရပါ။ ထပ်စမ်းကြည့်ပါ။",
    heading: "ပြန်လည်ကြိုဆိုပါသည်",
    subheading: "ခရီးစဉ်ဆက်လက်စီစဉ်ရန် အကောင့်ဝင်ပါ။",
    submit: "ဝင်မည်",
    submitting: "ဝင်နေသည်…",
    couldNotSignIn: "အကောင့်ဝင်၍မရပါ။ အချက်အလက်များ စစ်ဆေးပြီး ထပ်စမ်းကြည့်ပါ။",
    didNotComplete:
      "အကောင့်ဝင်ခြင်း မပြီးမြောက်ပါ။ ထပ်စမ်းကြည့်ပါ သို့မဟုတ် Google ဖြင့်ဆက်လက်ပါ။",
    codeNotComplete: "အကောင့်ဝင်ခြင်း မပြီးမြောက်ပါ။ Google ဖြင့် ဆက်လက်ကြည့်ပါ။",
    confirmTitle: "သင်ဖြစ်ကြောင်း အတည်ပြုပါ",
    confirmBody: "ဤစက်ပစ္စည်းသည် အသစ်ဖြစ်သဖြင့် ဂဏန်း ၆ လုံးကုဒ်ကို ပို့ထားပါသည်",
    verifyAndSignIn: "စစ်ဆေးပြီး ဝင်မည်",
  },

  profile: {
    title: "ကိုယ်ရေးအချက်အလက်",
    fallbackName: "ခရီးသွား",

    preferences: "စိတ်ကြိုက်ရွေးချယ်မှုများ",
    language: "ဘာသာစကား",
    currency: "ငွေကြေး",
    travelBudget: "ခရီးစရိတ်",

    support: "အကူအညီ",
    helpCenter: "အကူအညီစင်တာ",
    privacyPolicy: "ကိုယ်ရေးအချက်အလက်မူဝါဒ",
    termsOfService: "ဝန်ဆောင်မှုစည်းကမ်းများ",
    aboutTriply: "Triply အကြောင်း",

    account: "အကောင့်",
    signOut: "ထွက်မည်",
    deleteAccount: "အကောင့်ဖျက်မည်",
    deleting: "ဖျက်နေသည်…",

    deleteConfirmTitle: "အကောင့်ကိုဖျက်မှာသေချာပါသလား။",
    deleteConfirmBody:
      "ဤလုပ်ဆောင်ချက်သည် သင့်ခရီးစဉ်များ၊ စကားပြောများနှင့် သိမ်းဆည်းထားသော ရွေးချယ်မှုများကို အပြီးအပိုင်ဖျက်ပါမည်။ ပြန်လည်ရယူ၍မရပါ။",
    deleteFailedTitle: "အကောင့်ကို ဖျက်၍မရပါ",
  },

  budget: {
    Budget: "ချွေတာ",
    "Mid-range": "အလယ်အလတ်",
    Luxury: "ဇိမ်ခံ",
  },
};
