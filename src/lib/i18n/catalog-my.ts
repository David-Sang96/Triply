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
