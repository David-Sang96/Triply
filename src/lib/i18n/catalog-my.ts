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
