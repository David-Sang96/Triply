import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, Text } from "react-native";

import type { Interest } from "@/data/generate";
import { colors } from "@/theme/colors";

type Props = {
  interest: Interest;
  selected: boolean;
  /** True when the max is reached and this chip is not already selected. */
  disabled?: boolean;
  onToggle: () => void;
  width: number;
};

// A toggleable interest chip: icon + label, filling brand blue when selected
// and dimming when the selection limit blocks it.
export function InterestChip({
  interest,
  selected,
  disabled,
  onToggle,
  width,
}: Props) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={{ width }}
      className={`h-[52px] flex-row items-center justify-center rounded-xl border active:opacity-80 ${
        selected ? "border-brand bg-brand" : "border-line bg-surface"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <MaterialCommunityIcons
        name={interest.icon}
        size={17}
        color={selected ? colors.surface : interest.color}
      />
      <Text
        className={`ml-1.5 font-psemibold text-[13px] ${
          selected ? "text-white" : "text-ink"
        }`}
      >
        {interest.label}
      </Text>
    </Pressable>
  );
}
