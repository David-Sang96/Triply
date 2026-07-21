import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  onSeeAll?: () => void;
};

// "Section title" (H2) on the left, tappable "See all >" on the right.
export function SectionHeader({ title, onSeeAll }: Props) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-psemibold text-[20px] leading-[28px] text-ink">
        {title}
      </Text>
      <Pressable
        onPress={onSeeAll}
        className="flex-row items-center active:opacity-70"
        hitSlop={8}
      >
        <Text className="font-psemibold text-[13px] text-brand">See all</Text>
        <Text className="ml-0.5 font-psemibold text-[13px] text-brand">›</Text>
      </Pressable>
    </View>
  );
}
