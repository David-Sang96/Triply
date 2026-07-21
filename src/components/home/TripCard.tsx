import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { Trip } from "@/data/home";
import { colors } from "@/theme/colors";

// A saved-trip card: photo with a days badge, a favourite heart, and an
// overlaid title / dates / travel chips plus a circular open button.
export function TripCard({ trip }: { trip: Trip }) {
  return (
    <View className="h-[190px] w-[240px] overflow-hidden rounded-2xl">
      <Image
        source={{ uri: trip.image }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />
      <View className="absolute inset-0 bg-black/25" />

      {/* Days badge */}
      <View className="absolute left-3 top-3 flex-row items-center rounded-full bg-black/55 px-2.5 py-1">
        <Ionicons name="star" size={11} color={colors.warning} />
        <Text className="ml-1 font-psemibold text-[11px] text-white">
          {trip.days}
        </Text>
      </View>

      {/* Favourite */}
      <View className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-white/90">
        <Ionicons name="heart-outline" size={16} color={colors.ink} />
      </View>

      {/* Bottom info */}
      <View className="absolute inset-x-0 bottom-0 p-3.5">
        <Text className="font-pbold text-[16px] text-white">{trip.title}</Text>
        <Text className="mt-0.5 font-sans text-[11px] text-white/85">
          {trip.dates}
        </Text>

        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="people" size={12} color={colors.surface} />
            <Text className="ml-1 font-pmedium text-[11px] text-white/90">
              {trip.travelers}
            </Text>
            <Text className="mx-1.5 text-[11px] text-white/70">•</Text>
            <Text className="font-pmedium text-[11px] text-white/90">
              {trip.budget}
            </Text>
          </View>

          <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-black/55 active:opacity-80">
            <Ionicons name="arrow-forward" size={15} color={colors.surface} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
