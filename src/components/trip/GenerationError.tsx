import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { colors } from "@/theme/colors";

export function GenerationError({
  message,
  onRetry,
  onBack,
  retrying = false,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
  // Retrying is a round trip to the server before the screen changes. Without
  // this the button looks dead for a second and invites a second tap, which
  // would queue the generation twice.
  retrying?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center font-psemibold text-[17px] text-ink">
          {t("generation.errorHeader")}
        </Text>
        <View className="h-8 w-8" />
      </View>

      {/* Body */}
      <View className="items-center px-8 pt-16">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <Ionicons name="alert-circle-outline" size={46} color={colors.error} />
        </View>

        <Text className="mt-6 text-center font-pbold text-[20px] text-ink">
          {t("generation.errorTitle")}
        </Text>
        <Text className="mt-2 text-center font-sans text-[14px] leading-[20px] text-muted">
          {message}
        </Text>

        <Pressable
          onPress={onRetry}
          disabled={retrying}
          // Inline opacity, not a `disabled:` class — NativeWind's opacity
          // modifiers are unreliable here (see the notes on bg-black/30).
          style={{ opacity: retrying ? 0.6 : 1 }}
          className="mt-8 h-[52px] w-full flex-row items-center justify-center rounded-xl bg-brand active:opacity-90"
        >
          {retrying ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={colors.surface} />
              <Text className="ml-2 font-psemibold text-[15px] text-white">
                {t("common.tryAgain")}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={onBack} className="mt-4 active:opacity-70" hitSlop={8}>
          <Text className="font-psemibold text-[14px] text-muted">
            {t("generation.backToHome")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
