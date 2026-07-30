import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

export type InfoSection = {
  heading: string;
  /** One paragraph per entry. */
  body: string[];
};

type Props = {
  title: string;
  /** Short line under the title, e.g. when the policy was last updated. */
  subtitle?: string;
  sections: InfoSection[];
  /** Rendered under the last section — used for the About screen's credits. */
  footer?: string;
};

/**
 * The read-only text screens reached from the Profile screen's Support card.
 * Uses the same back/centred-title bar as the other pushed screens.
 */
export function InfoScreen({ title, subtitle, sections, footer }: Props) {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityLabel="Go back"
          className="h-8 w-8 items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center font-psemibold text-[17px] text-ink">
          {title}
        </Text>
        {/* Balances the back button so the title stays optically centred. */}
        <View className="h-8 w-8" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10 pt-1"
      >
        {subtitle ? (
          <Text className="pb-3 font-sans text-[13px] text-faint">{subtitle}</Text>
        ) : null}

        {/* Indices as keys: the copy is a fixed literal per screen, never
            reordered, and two identical paragraphs would collide on content. */}
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} className="pb-5">
            <Text className="pb-1.5 font-psemibold text-[15px] text-ink">
              {section.heading}
            </Text>
            {section.body.map((paragraph, paragraphIndex) => (
              <Text
                key={paragraphIndex}
                className="pb-2 font-sans text-[14px] leading-[21px] text-muted"
              >
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        {footer ? (
          <Text className="font-sans text-[12px] leading-[18px] text-faint">
            {footer}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
