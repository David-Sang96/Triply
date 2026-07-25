import { Pressable, Text, View } from "react-native";

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
  return (
    <Pressable
      onPress={onPress}
      className="w-[92px] items-center rounded-2xl px-2 py-3 active:opacity-80"
      style={{ backgroundColor: item.bg }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/70">
        <Text className="text-[18px]">{item.emoji}</Text>
      </View>
      <Text className="mt-2 text-center font-psemibold text-[11px] leading-[14px] text-ink">
        {item.label}
      </Text>
    </Pressable>
  );
}
