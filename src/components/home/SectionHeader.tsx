import {
  Pressable,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";

type Props = {
  title: string;
  onSeeAll?: () => void;
};

// "Section title" (H2) on the left, tappable "See all >" on the right.
export function SectionHeader({ title, onSeeAll }: Props) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between gap-3">
      {/* flex-1 + numberOfLines, because a translated title can be much longer
          than the English one and would otherwise run straight into "See all".
          Burmese "Popular destinations" does exactly that. */}
      <Text
        className="flex-1 font-psemibold text-[20px] leading-[28px] text-ink"
        numberOfLines={1}
      >
        {title}
      </Text>
      <Pressable
        onPress={onSeeAll}
        // shrink-0 keeps the action at its natural width, so the title is what
        // gives way rather than "See all" being clipped.
        className="shrink-0 flex-row items-center active:opacity-70"
        hitSlop={8}
      >
        <Text className="font-psemibold text-[13px] text-brand">
          {t("home.seeAll")}
        </Text>
        <Text className="ml-0.5 font-psemibold text-[13px] text-brand">›</Text>
      </Pressable>
    </View>
  );
}
