import { Text as RNText, type TextProps } from "react-native";

import { useLanguage, type Language } from "@/lib/preferences";

// Why this component exists, so nobody "simplifies" it away:
//
// Every Text in this app picks its family from a NativeWind class
// (font-sans / font-pmedium / font-psemibold / font-pbold). NativeWind v5
// resolves those to a concrete family at BUILD time, so no runtime CSS
// variable can change them — vars() was measured on device and had literally
// no effect (0.03 mean ink difference against the unstyled control, i.e.
// identical). An explicit `style` fontFamily, however, does win over the
// class: measured 0.02 against the same text rendered with that family
// directly. See _plans/i18n-english-burmese.md.
//
// So the language swap happens here: read the class the caller already wrote,
// and inject the matching family for the active language. Callers keep their
// className exactly as it is; only their import line changes.
//
// This ALSO fixes a pre-existing bug. `font-sans` is a Tailwind built-in whose
// default value is a comma-separated CSS stack, and a stack is not a valid
// React Native fontFamily — so all 56 font-sans sites were silently rendering
// in the system font, not Poppins (measured 0.02 from a nonexistent family).
// Mapping it explicitly below is what makes global.css's stated intent true.

const FAMILIES: Record<Language, Record<Weight, string>> = {
  en: {
    sans: "Poppins_400Regular",
    pmedium: "Poppins_500Medium",
    psemibold: "Poppins_600SemiBold",
    pbold: "Poppins_700Bold",
  },
  my: {
    sans: "NotoSansMyanmar_400Regular",
    pmedium: "NotoSansMyanmar_500Medium",
    psemibold: "NotoSansMyanmar_600SemiBold",
    pbold: "NotoSansMyanmar_700Bold",
  },
};

type Weight = "sans" | "pmedium" | "psemibold" | "pbold";

// Checked most-specific first: "font-psemibold" contains neither of the other
// names, but matching loosely would still be a trap worth avoiding.
function weightOf(className: string | undefined): Weight {
  if (!className) return "sans";
  if (/\bfont-pbold\b/.test(className)) return "pbold";
  if (/\bfont-psemibold\b/.test(className)) return "psemibold";
  if (/\bfont-pmedium\b/.test(className)) return "pmedium";
  return "sans";
}

export function fontFamilyFor(
  className: string | undefined,
  language: Language,
): string {
  return FAMILIES[language][weightOf(className)];
}

/**
 * Drop-in replacement for React Native's Text that follows the app language.
 * Import this instead of `Text` from "react-native"; everything else about the
 * call site stays the same.
 */
export function Text({ className, style, ...rest }: TextProps) {
  const language = useLanguage();

  return (
    <RNText
      className={className}
      // Ours goes first so a caller passing their own fontFamily still wins.
      style={[{ fontFamily: fontFamilyFor(className, language) }, style]}
      {...rest}
    />
  );
}
