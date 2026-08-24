import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import { colors } from "@/theme/colors";

type Props<T extends string> = {
  /** Null closes the sheet; a title opens it. */
  title: string | null;
  options: readonly T[];
  value: T;
  onSelect: (next: T) => void;
  onClose: () => void;
  /**
   * How to display an option. Defaults to the value itself, which is right for
   * currencies and budgets. Language options are codes ("en"/"my"), so that
   * row passes a lookup instead — otherwise the sheet would offer "en".
   */
  labelOf?: (option: T) => string;
};

/**
 * A bottom sheet that picks one value from a short list — what the chevron on a
 * Preferences row opens. Built on React Native's `Modal` rather than `@expo/ui`
 * so it needs no native rebuild.
 */
export function OptionSheet<T extends string>({
  title,
  options,
  value,
  onSelect,
  onClose,
  labelOf = (option) => option,
}: Props<T>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={title !== null}
      transparent
      animationType="slide"
      // Android's hardware back button and a swipe-down both dismiss.
      onRequestClose={onClose}
    >
      {/* Tapping the dimmed area closes the sheet. The scrim colour is inline
          because NativeWind's `bg-black/30` does not resolve in this setup. */}
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        accessibilityLabel="Close"
        onPress={onClose}
      >
        {/* Swallows taps so pressing the sheet itself does not close it. */}
        <Pressable
          className="rounded-t-2xl bg-surface px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
          onPress={() => {}}
        >
          <View className="flex-row items-center justify-between pb-1">
            <Text className="font-psemibold text-[16px] text-ink">{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-8 w-8 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            // Long lists (currencies) scroll; short ones size to content.
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option, index) => {
              const selected = option === value;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={`h-[52px] flex-row items-center justify-between active:opacity-60 ${
                    index === 0 ? "" : "border-t border-line"
                  }`}
                >
                  <Text
                    className={`text-[15px] ${
                      selected ? "font-psemibold text-brand" : "font-sans text-ink"
                    }`}
                  >
                    {labelOf(option)}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={20} color={colors.brand} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
