import {
  Pressable,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";

type Props<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
};

// A single-select row of equal-width pills; the chosen one fills brand blue.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-2.5" accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`h-12 flex-1 items-center justify-center rounded-xl border active:opacity-90 ${
              selected ? "border-brand bg-brand" : "border-line bg-surface"
            }`}
          >
            <Text
              className={`font-psemibold text-[13px] ${
                selected ? "text-white" : "text-ink"
              }`}
            >
              {t(`budget.${option}` as "budget.Budget")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
