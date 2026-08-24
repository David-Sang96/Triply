import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Text } from "@/components/Text";
import type { HeroSlide } from "@/lib/destinations";
import { colors, shadows } from "@/theme/colors";

type Props = {
  name: string;
  slides: HeroSlide[];
  onGenerate?: () => void;
};

// Shown while destinations are still loading, or if none are hero-flagged —
// no photo, just the brand-color background, so the greeting/button always
// have somewhere to sit rather than the screen showing a gap.
const FALLBACK_SLIDE: HeroSlide = {
  id: "fallback",
  image: "",
  title: "Ready for your\nnext adventure?",
  subtitle: "Let AI plan your next trip.",
};

// Hero "content slider": the background image and the middle headline/subtitle
// change together every 5 seconds with a soft fade. The greeting and the
// "Generate a trip" button stay fixed across slides.
export function HeroCarousel({ name, slides, onGenerate }: Props) {
  const [index, setIndex] = useState(0);
  // Lazy init keeps a single Animated.Value across renders without reading a
  // ref during render. The image and headline share it so they fade as one.
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  // Dip the shared opacity on each slide change, then ease back to full — the
  // image and text share this value so they transition as one.
  useEffect(() => {
    fade.setValue(0.35);
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [index, fade]);

  // Computed with modulo (not a direct slides[index] lookup) so a shrinking
  // list — e.g. a refetch returning fewer hero-eligible destinations — never
  // leaves `index` pointing past the end; it's always back in range on the
  // very next render, no effect-based correction needed.
  const slide =
    slides.length > 0 ? slides[index % slides.length] : FALLBACK_SLIDE;

  return (
    <View className="h-[236px] w-full overflow-hidden rounded-3xl bg-brand">
      {/* Background image — fades with each slide */}
      {slide.image ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Image
            source={{ uri: slide.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
        </Animated.View>
      ) : null}

      {/* Legibility overlay */}
      <View className="absolute inset-0 bg-[#0B2A4A]/45" />

      {/* Foreground content */}
      <View className="flex-1 justify-between p-5">
        <Text className="font-pmedium text-[15px] text-white">
          Hello, {name} 👋
        </Text>

        <Animated.View style={{ opacity: fade }}>
          <Text className="font-pbold text-[24px] leading-[30px] text-white">
            {slide.title}
          </Text>
          <Text className="mt-1.5 font-sans text-[13px] leading-[18px] text-white/90">
            {slide.subtitle}
          </Text>
        </Animated.View>

        <Pressable
          onPress={onGenerate}
          className="mt-3 h-[46px] flex-row items-center justify-center self-start rounded-xl bg-brand px-5 active:opacity-90"
          style={shadows.md}
        >
          <Ionicons name="sparkles" size={16} color={colors.surface} />
          <Text className="ml-2 font-psemibold text-[15px] text-white">
            Generate a trip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
