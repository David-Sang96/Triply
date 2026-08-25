import { View, type DimensionValue } from "react-native";

// Darkens a photo so white text over it stays readable.
//
// The colours are inline rgba, NOT NativeWind's bg-black/NN. Those opacity
// utilities do not resolve in this setup, so every card that thought it had a
// scrim had none at all. Measured on the Home trip card, same card and scroll
// position: with `bg-black/30` the photo sat at mean luminance 235.3 — i.e.
// untouched — while an inline rgba(0,0,0,0.8) took it to 132.6. The day chip's
// `bg-black/55` pill was likewise invisible, leaving the star and label
// directly on the picture. OptionSheet already records the same quirk for its
// modal scrim.
//
// Weighted toward the bottom, where a card's title and meta row sit, so the
// top of the picture keeps its contrast rather than the whole thing going flat
// and grey.
//
// Stacked bands rather than a true gradient: expo-linear-gradient is a native
// module, and pulling one in would force a dev-client rebuild for what is a
// legibility fix. Four overlapping layers read as a smooth ramp at this size.
const BANDS: { height: DimensionValue; alpha: number }[] = [
  { height: "100%", alpha: 0.16 },
  { height: "60%", alpha: 0.12 },
  { height: "40%", alpha: 0.14 },
  { height: "20%", alpha: 0.18 },
];

/**
 * Place directly after the photo and before any text, inside a container that
 * already clips (`overflow-hidden`).
 */
export function PhotoScrim() {
  return (
    <>
      {BANDS.map((band) => (
        <View
          key={String(band.height)}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: band.height,
            backgroundColor: `rgba(0,0,0,${band.alpha})`,
          }}
        />
      ))}
    </>
  );
}

/** Background for the small pills that float on a photo (day count, rating). */
export const PILL_ON_PHOTO = { backgroundColor: "rgba(0,0,0,0.55)" } as const;
