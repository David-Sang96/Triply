// Triply design system palette (design/design-system.png) for JavaScript use —
// icon `color` props, native-tab tints, and other places that need a real color
// value rather than a className. Keep these in sync with the @theme tokens in
// global.css.
export const colors = {
  brand: "#208AEF", // Primary — Sky Blue
  brandSoft: "#EAF2FE", // Tinted brand surface (selected states)
  coral: "#FF6B68", // Secondary — Coral
  ink: "#111827", // Text / Primary
  muted: "#6B7280", // Text / Secondary
  faint: "#9CA3AF", // Hints, placeholders, disabled
  line: "#E5E7EB", // Border
  canvas: "#F7FAFC", // Background
  surface: "#FFFFFF", // Surface / cards
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;

// Design system shadows (Sm / Md / Lg / Xl), expressed for React Native.
// Android reads `elevation`; iOS reads the shadow* fields.
export const shadows = {
  sm: {
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: "#101828",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
