import { isValidElement, type ReactNode } from "react";
import { Text as RNText, type TextProps } from "react-native";

import { type Language } from "@/lib/preferences";

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

// U+1000–U+109F is the Myanmar block. Extended-A/B exist but this app's
// Burmese never leaves the base block.
const MYANMAR = /[က-႟]/;

/**
 * Whether anything actually rendered here is Burmese.
 *
 * The font is chosen by CONTENT, not by the app language, and that is the
 * whole point. Noto Sans Myanmar's vertical metrics are far taller than
 * Poppins' — it has to leave room for stacked marks above and below the
 * baseline. Applying it to Latin text inflates every line box, which was
 * measured on the hero card: the same English title from the destinations
 * table rendered ~40dp taller in Burmese mode, pushing the "Generate a trip"
 * button through the bottom of its fixed-height card and clipping it.
 *
 * So Latin stays on Poppins whatever the language is. A mixed string (say
 * "Triply အကူအညီပေးသူ") goes to Noto, because it must: Poppins has no Myanmar
 * glyphs at all.
 */
function hasMyanmar(node: ReactNode): boolean {
  if (typeof node === "string") return MYANMAR.test(node);
  if (typeof node === "number") return false;
  if (Array.isArray(node)) return node.some(hasMyanmar);
  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return children === undefined ? false : hasMyanmar(children);
  }
  return false;
}

// Burmese set at the same point size as Latin reads noticeably bigger, because
// a Myanmar line stacks marks above and below the round bases. Measured on the
// Home section headings, both at text-[20px]: English "Your trips" covers
// 21.0dp of ink, Burmese "သင့်ခရီးစဉ်များ" covers 29.7dp — 41% taller for the
// same nominal size.
//
// Matching the two exactly would need ~0.71, which shrinks the round bases
// (already only 11.0dp) past comfortable reading. This is the usual compromise
// for Myanmar alongside Latin: take most of the difference out, leave the
// script the vertical room it genuinely needs.
const MYANMAR_FONT_SCALE = 0.85;

// …but not below this. The scale is an optical correction for text that reads
// too large; at the small end Burmese needs every pixel it has, because the
// marks stacked around each base collapse into the base before the base itself
// becomes unreadable. This app's smallest sizes are 10px and 11px, and 0.85
// would drop both to 9px.
const MYANMAR_MIN_FONT_SIZE = 12;

// Never scales UP: a design that already asked for 10px keeps 10px.
function myanmarFontSize(size: number): number {
  return Math.min(size, Math.max(MYANMAR_MIN_FONT_SIZE, Math.round(size * MYANMAR_FONT_SCALE)));
}

// Every font size in this app is written as text-[Npx] — 199 of them, and not
// one uses Tailwind's named scale — so parsing it here is reliable. If a named
// size ever appears, it simply won't match and the size is left alone.
function fontSizeOf(className: string | undefined): number | undefined {
  const match = className?.match(/\btext-\[(\d+)px\]/);
  return match ? Number(match[1]) : undefined;
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
export function Text({ className, style, children, ...rest }: TextProps) {
  const script: Language = hasMyanmar(children) ? "my" : "en";
  const size = script === "my" ? fontSizeOf(className) : undefined;

  return (
    <RNText
      className={className}
      // Ours go first so a caller passing their own fontFamily or fontSize
      // still wins.
      style={[
        { fontFamily: fontFamilyFor(className, script) },
        size ? { fontSize: myanmarFontSize(size) } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
