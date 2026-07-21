import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";

import type { Pace } from "@/data/generate";
import { colors } from "@/theme/colors";

// A single-select "travel pace" row: icon tile, title + description, and a
// radio-style check on the right. The whole row highlights when chosen.
export function PaceOption({
  pace,
  selected,
  onSelect,
}: {
  pace: Pace;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      className={`mb-2.5 flex-row items-center rounded-xl border px-3.5 py-3 active:opacity-90 ${
        selected ? "border-brand bg-brand-soft" : "border-line bg-surface"
      }`}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-lg ${
          selected ? "bg-brand" : "bg-line"
        }`}
      >
        <Ionicons
          name={pace.icon}
          size={18}
          color={selected ? colors.surface : colors.muted}
        />
      </View>

      <View className="ml-3 flex-1">
        <Text className="font-psemibold text-[14px] text-ink">{pace.label}</Text>
        <Text className="font-sans text-[12px] text-muted">
          {pace.description}
        </Text>
      </View>

      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={selected ? colors.brand : colors.faint}
      />
    </Pressable>
  );
}
