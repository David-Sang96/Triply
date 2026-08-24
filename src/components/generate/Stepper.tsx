import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  View,
} from "react-native";

import { Text } from "@/components/Text";
import { colors } from "@/theme/colors";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  /** Small hint shown below the box, e.g. "1 – 7 days". */
  helper: string;
};

// A clamped number stepper: [ − ] value [ + ] with a helper line underneath.
export function Stepper({ value, min, max, onChange, helper }: Props) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View>
      <View className="h-14 flex-row items-center justify-between rounded-xl border border-line bg-surface px-2">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={atMin}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Decrease value"
          className="h-12 w-12 items-center justify-center active:opacity-60"
        >
          <Ionicons
            name="remove"
            size={22}
            color={atMin ? colors.faint : colors.brand}
          />
        </Pressable>

        <Text className="font-pbold text-[16px] text-ink">{value}</Text>

        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={atMax}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Increase value"
          className="h-12 w-12 items-center justify-center active:opacity-60"
        >
          <Ionicons
            name="add"
            size={22}
            color={atMax ? colors.faint : colors.brand}
          />
        </Pressable>
      </View>

      <Text className="mt-1.5 text-center font-sans text-[12px] text-faint">
        {helper}
      </Text>
    </View>
  );
}
