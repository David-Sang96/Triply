import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TripStatus } from "@/lib/trips";
import { colors, shadows } from "@/theme/colors";

const STEPS = [
  "Understanding your preferences",
  "Generating itinerary with AI",
  "Verifying places & locations",
  "Finding the best images",
  "Finalizing your trip",
];

// How far the pipeline has progressed, as an index into STEPS.
const STATUS_STEP: Record<TripStatus, number> = {
  queued: 0,
  generating: 1,
  enriching: 2,
  imaging: 3,
  finalizing: 4,
  ready: 5,
  failed: -1,
};

export function GenerationLoading({
  status,
  onBack,
}: {
  status: TripStatus;
  onBack: () => void;
}) {
  const active = STATUS_STEP[status];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center font-psemibold text-[17px] text-ink">
          Generating your trip
        </Text>
        <View className="h-8 w-8" />
      </View>

      <View className="px-6">
        <View className="mt-4 items-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-soft">
            <Ionicons name="sparkles" size={40} color={colors.brand} />
          </View>
        </View>

        <Text className="mt-6 text-center font-pbold text-[22px] text-ink">
          Crafting your perfect itinerary…
        </Text>
        <Text className="mt-2 text-center font-sans text-[14px] text-muted">
          This usually takes 30–60 seconds.
        </Text>

        <View
          className="mt-6 rounded-2xl border border-line bg-surface p-4"
          style={shadows.sm}
        >
          {STEPS.map((label, i) => {
            const done = i < active;
            const isActive = i === active;
            return (
              <View
                key={label}
                className={`flex-row items-center ${i > 0 ? "mt-4" : ""}`}
              >
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${
                    done ? "bg-success" : isActive ? "bg-brand" : "bg-line"
                  }`}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={16} color={colors.surface} />
                  ) : isActive ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text className="font-psemibold text-[12px] text-muted">
                      {i + 1}
                    </Text>
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-psemibold text-[14px] ${
                      done || isActive ? "text-ink" : "text-muted"
                    }`}
                  >
                    {label}
                  </Text>
                  <Text className="font-sans text-[12px] text-faint">
                    {done ? "Done" : isActive ? "In progress" : "Pending"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mt-5 flex-row rounded-2xl bg-brand-soft p-4">
          <Ionicons name="bulb-outline" size={18} color={colors.brand} />
          <View className="ml-3 flex-1">
            <Text className="font-psemibold text-[13px] text-brand">
              Did you know?
            </Text>
            <Text className="mt-0.5 font-sans text-[13px] text-muted">
              We verify every place and optimize the route to give you the best
              experience.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
