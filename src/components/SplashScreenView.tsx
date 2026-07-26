import { Image } from "expo-image";
import { useEffect } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const BG = require("@/assets/images/splash-bg.png");
const GLOBE = require("@/assets/images/splash-globe.png");

// Every number below is measured from design/splash-screen.png, whose canvas is
// 853 x 1844. Sizes scale with screen WIDTH and vertical positions with screen
// HEIGHT, so the composition holds on aspect ratios near the design's 2.16:1.
//
// The native splash that runs before this one is configured in app.json
// (expo-splash-screen). Its backgroundColor is a mid-tone of the gradient
// below so the hand-off isn't a visible flash — keep the two in sync, and note
// a change there only takes effect after a native rebuild.
const DESIGN_W = 853;
const DESIGN_H = 1844;

// Globe artwork (design/world.png, cropped to its visible bounds).
const GLOBE_W = 497;
const GLOBE_TOP = 563;
const GLOBE_ASPECT = 855 / 804;

// Type. Poppins' cap height is 0.70em, so a cap-top measurement converts to a
// font size by dividing by 0.70, and back to a box offset by multiplying.
const CAP_RATIO = 0.7;
const TITLE_SIZE = 160; // cap height 112px in the design
const TITLE_CAP_TOP = 1065;
// The design's wordmark is tracked tighter than stock Poppins Bold: at the
// matching cap height it measures ~10% narrower, so the letters are pulled in.
const TITLE_TRACKING = -8.8;
const SUBTITLE_SIZE = 43; // cap height 32px in the design
const SUBTITLE_CAP_TOP = 1229;

// Loading ring: 12 dots every 30°, fading around the ring.
const DOT_COUNT = 12;
const RING_CENTER_Y = 1665;
const RING_RADIUS = 31.35;
const DOT_SIZE = 11.65;
const DOT_COLOR = "#0042E6";
const DOT_MIN_OPACITY = 0.26;

function LoadingRing({ size, radius, dot }: { size: number; radius: number; dot: number }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, spinStyle]}>
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        // 0 is 12 o'clock, advancing clockwise — matching how the design's
        // trail is laid out.
        const angle = (i / DOT_COUNT) * 2 * Math.PI;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: DOT_COLOR,
              opacity:
                DOT_MIN_OPACITY +
                (1 - DOT_MIN_OPACITY) * (i / (DOT_COUNT - 1)),
              left: size / 2 + radius * Math.sin(angle) - dot / 2,
              top: size / 2 - radius * Math.cos(angle) - dot / 2,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

// The app's boot screen: shown while fonts and the Clerk session load.
// Mirrors design/splash-screen.png.
export function SplashScreenView() {
  const { width, height } = useWindowDimensions();

  // Sizes track width; vertical positions track height.
  const sw = (n: number) => (n / DESIGN_W) * width;
  const sh = (n: number) => (n / DESIGN_H) * height;

  const globeW = sw(GLOBE_W);
  const titleSize = sw(TITLE_SIZE);
  const subtitleSize = sw(SUBTITLE_SIZE);
  const ringSize = sw((RING_RADIUS + DOT_SIZE / 2) * 2);

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={BG}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
      />

      <Image
        source={GLOBE}
        style={{
          position: "absolute",
          left: (width - globeW) / 2,
          top: sh(GLOBE_TOP),
          width: globeW,
          height: globeW / GLOBE_ASPECT,
        }}
        contentFit="contain"
      />

      <Text
        style={{
          position: "absolute",
          top: sh(TITLE_CAP_TOP) - titleSize * (1 - CAP_RATIO) * 0.5,
          width,
          textAlign: "center",
          fontFamily: "Poppins_700Bold",
          fontSize: titleSize,
          lineHeight: titleSize,
          letterSpacing: sw(TITLE_TRACKING),
          color: "#0029A9",
          includeFontPadding: false,
        }}
      >
        Triply
      </Text>

      <Text
        style={{
          position: "absolute",
          top: sh(SUBTITLE_CAP_TOP) - subtitleSize * (1 - CAP_RATIO) * 0.5,
          width,
          textAlign: "center",
          fontFamily: "Poppins_500Medium",
          fontSize: subtitleSize,
          lineHeight: subtitleSize,
          color: "#567FC9",
          includeFontPadding: false,
        }}
      >
        AI Travel Planner
      </Text>

      <View
        style={{
          position: "absolute",
          left: width / 2 - ringSize / 2,
          top: sh(RING_CENTER_Y) - ringSize / 2,
        }}
      >
        <LoadingRing size={ringSize} radius={sw(RING_RADIUS)} dot={sw(DOT_SIZE)} />
      </View>
    </View>
  );
}
