import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Pressable,
} from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
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
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      style={{ width }}
      className={`min-h-[52px] py-2 flex-row items-center justify-center rounded-xl border active:opacity-80 ${
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
        {/* The cast is the escape hatch for a dynamic key: interest.id is
            typed `string`, so the template literal cannot be proved to be a
            real catalog key. Every id in src/data/generate.ts has one, and a
            missing key would render the id rather than crash. */}
        {t(`interests.${interest.id}` as "interests.food")}
      </Text>
    </Pressable>
  );
}
