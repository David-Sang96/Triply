import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import type { TripStatus } from "@/lib/trips";
import { colors, shadows } from "@/theme/colors";

// Catalog keys, not strings: the labels have to follow the language, and a
// module-level array of literals would freeze whichever one was active at
// import time.
const STEP_KEYS = [
  "generation.step1",
  "generation.step2",
  "generation.step3",
  "generation.step4",
  "generation.step5",
] as const;

// How far the pipeline has progressed, as an index into STEP_KEYS.
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
  const { t } = useTranslation();
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
          {t("generation.loadingTitle")}
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
          {t("generation.crafting")}
        </Text>
        <Text className="mt-2 text-center font-sans text-[14px] text-muted">
          {t("generation.craftingTime")}
        </Text>

        <View
          className="mt-6 rounded-2xl border border-line bg-surface p-4"
          style={shadows.sm}
        >
          {STEP_KEYS.map((stepKey, i) => {
            const done = i < active;
            const isActive = i === active;
            return (
              <View
                key={stepKey}
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
                    {t(stepKey)}
                  </Text>
                  <Text className="font-sans text-[12px] text-faint">
                    {done
                      ? t("generation.statusDone")
                      : isActive
                        ? t("generation.statusInProgress")
                        : t("generation.statusPending")}
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
              {t("generation.didYouKnow")}
            </Text>
            <Text className="mt-0.5 font-sans text-[13px] text-muted">
              {t("generation.didYouKnowBody")}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
