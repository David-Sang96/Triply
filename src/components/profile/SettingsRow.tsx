import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, Text } from "react-native";

import { colors } from "@/theme/colors";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  /** Right-aligned current value, e.g. "English". Omitted on link-only rows. */
  value?: string;
  /** Draws the hairline separator above the row — every row except the first. */
  divided?: boolean;
  onPress: () => void;
};

/**
 * A 48dp settings row: icon, label, optional value, chevron. Sizes are measured
 * from design/profile-screen.png — see SettingsCard for the canvas conversion
 * and why these are explicit px.
 */
export function SettingsRow({ icon, label, value, divided, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // The value is part of the label so a screen reader announces the current
      // choice, not just the setting's name.
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className={`h-[48px] flex-row items-center gap-[15px] active:opacity-60 ${
        divided ? "border-t border-line" : ""
      }`}
    >
      <Ionicons name={icon} size={19} color={colors.ink} />
      <Text className="flex-1 font-pmedium text-[12px] text-ink">{label}</Text>
      {value ? (
        <Text className="font-sans text-[12px] text-muted">{value}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </Pressable>
  );
}
