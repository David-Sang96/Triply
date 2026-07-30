import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

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
      className={`overflow-hidden rounded-2xl active:opacity-90 ${
        full ? "h-[200px] w-full" : "h-[172px] w-[132px]"
      }`}
    >
      <Image
        source={{ uri: destination.imageUrl }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
      <View className="absolute inset-0 bg-black/25" />

      <View className="absolute right-2.5 top-2.5 flex-row items-center rounded-full bg-black/55 px-2 py-0.5">
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
