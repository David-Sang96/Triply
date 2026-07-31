import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
  /**
   * Opens a web page in the in-app browser, under the sections. Used by the
   * Privacy Policy screen to reach the full published policy, which is longer
   * than this screen summarises.
   */
  link?: { label: string; url: string };
  /** Rendered under the last section — used for the About screen's credits. */
  footer?: string;
};

/**
 * The read-only text screens reached from the Profile screen's Support card.
 * Uses the same back/centred-title bar as the other pushed screens.
 */
export function InfoScreen({ title, subtitle, sections, link, footer }: Props) {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));
  // The SafeAreaView only claims the top edge, so the scroll view runs under the
  // navigation bar. Its inset is added to the content padding instead of the
  // container, which keeps the list scrolling the full height of the screen.
  const insets = useSafeAreaInsets();

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
        contentContainerClassName="px-5 pt-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
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

        {link ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(link.url)}
            accessibilityRole="link"
            accessibilityLabel={`${link.label}, opens in a browser`}
            className="mb-5 flex-row items-center gap-1.5 active:opacity-60"
          >
            <Text className="font-psemibold text-[14px] text-brand">{link.label}</Text>
            <Ionicons name="open-outline" size={15} color={colors.brand} />
          </Pressable>
        ) : null}

        {footer ? (
          <Text className="font-sans text-[12px] leading-[18px] text-faint">
            {footer}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
