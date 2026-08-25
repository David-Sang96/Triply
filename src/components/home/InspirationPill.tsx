import {
  Pressable,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import type { Inspiration } from "@/data/home";

// A small "AI inspiration" tile: a tinted card with an emoji chip and a
// two-line category label. Tapping opens the Generate form with the
// matching interest already selected.
export function InspirationPill({
  item,
  onPress,
}: {
  item: Inspiration;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const label = t(`inspirations.${item.id}` as "inspirations.food");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label.replace("\n", " ")} — plan a trip with this interest`}
      className="w-[92px] items-center rounded-2xl px-2 py-3 active:opacity-80"
      style={{ backgroundColor: item.bg }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/70">
        <Text className="text-[18px]">{item.emoji}</Text>
      </View>
      <Text className="mt-2 text-center font-psemibold text-[11px] leading-[14px] text-ink">
        {label}
      </Text>
    </Pressable>
  );
}
