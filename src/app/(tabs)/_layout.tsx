import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";

import { SplashScreenView } from "@/components/SplashScreenView";
import { useLanguage } from "@/lib/preferences";
import { colors } from "@/theme/colors";

// Signed-in app shell. Native tabs are mandatory here (see AGENTS.md) — never
// swap in a JS/custom tab bar. Signed-out users are bounced to the welcome flow.
export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useTranslation();
  const language = useLanguage();

  // Keeps the boot screen up while Clerk restores the session, instead of a
  // blank frame between the native splash and the first tab.
  if (!isLoaded) return <SplashScreenView />;
  if (!isSignedIn) return <Redirect href="/welcome" />;

  return (
    // labelVisibilityMode="labeled" keeps every tab's text visible on Android
    // (Material defaults to showing the label only for the selected tab). No
    // effect on iOS, which always shows labels.
    // key={language} remounts the native tab bar when the language changes.
    // Verified on the emulator: switching language repaints the four labels at
    // the same moment as the screen, and the app stays on the tab it was on
    // rather than resetting to Home.
    //
    // Whether the key is strictly required is not established — Fast Refresh
    // does not apply to this file (a temporary red tintColor produced 0 red
    // pixels), so the only way to test either version is a full reload. It is
    // cheap and harmless: changing language is rare.
    <NativeTabs
      key={language}
      tintColor={colors.brand}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* The trip form is reachable from plenty of places already (hero,
          empty states, inspiration tiles, destination pages), so this slot
          holds the assistant instead. It opens the conversation list; a single
          conversation pushes /chat, which sits outside this group and so
          covers the tab bar. */}
      <NativeTabs.Trigger name="assistant">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "bubble.left.and.bubble.right",
            selected: "bubble.left.and.bubble.right.fill",
          }}
          md="chat"
        />
        <NativeTabs.Trigger.Label>{t("tabs.assistant")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon
          sf={{ default: "suitcase", selected: "suitcase.fill" }}
          md="work"
        />
        <NativeTabs.Trigger.Label>{t("tabs.trips")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
        <NativeTabs.Trigger.Label>{t("tabs.profile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
