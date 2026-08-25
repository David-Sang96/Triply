import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import {
  Pressable,
  View,
} from "react-native";

import { PhotoScrim, PILL_ON_PHOTO } from "@/components/PhotoScrim";
import { Text } from "@/components/Text";
import type { Destination } from "@/lib/destinations";
import { colors } from "@/theme/colors";

// A compact popular-destination card: photo with a rating badge and the
// place name / country overlaid at the bottom. Tapping opens the
// destination detail screen.
export function DestinationCard({
  destination,
  onPress,
  full,
}: {
  destination: Destination;
  onPress?: () => void;
  /** Fills its parent's width, for the two-column grid on the all-destinations
   * screen; default is the fixed-width card used by the Home horizontal rail. */
  full?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      // bg-line is the placeholder the card sits on until its photo arrives.
      // Without it an unloaded card is transparent, which reads as a blank white
      // gap — very visible on the two-column all-destinations grid, where
      // FlatList windowing mounts a fresh row's images only as you reach it.
      // The photo fades in over this via `transition` below.
      className={`overflow-hidden rounded-2xl bg-line active:opacity-90 ${
        full ? "h-[200px] w-full" : "h-[172px] w-[132px]"
      }`}
    >
      <Image
        source={{ uri: destination.imageUrl }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
      <PhotoScrim />

      <View className="absolute right-2.5 top-2.5 flex-row items-center rounded-full px-2 py-0.5" style={PILL_ON_PHOTO}>
        <Ionicons name="star" size={10} color={colors.warning} />
        <Text className="ml-1 font-psemibold text-[10px] text-white">
          {destination.rating}
        </Text>
      </View>

      <View className="absolute inset-x-0 bottom-0 p-3">
        <Text className="font-pbold text-[15px] text-white">
          {destination.name}
        </Text>
        <Text className="font-sans text-[11px] text-white/85">
          {destination.country}
        </Text>
      </View>
    </Pressable>
  );
}
