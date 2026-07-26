import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { SplashScreenView } from "@/components/SplashScreenView";
import { colors } from "@/theme/colors";

// Signed-in app shell. Native tabs are mandatory here (see AGENTS.md) — never
// swap in a JS/custom tab bar. Signed-out users are bounced to the welcome flow.
export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Keeps the boot screen up while Clerk restores the session, instead of a
  // blank frame between the native splash and the first tab.
  if (!isLoaded) return <SplashScreenView />;
  if (!isSignedIn) return <Redirect href="/welcome" />;

  return (
    // labelVisibilityMode="labeled" keeps every tab's text visible on Android
    // (Material defaults to showing the label only for the selected tab). No
    // effect on iOS, which always shows labels.
    <NativeTabs tintColor={colors.brand} labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
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
        <NativeTabs.Trigger.Label>Assistant</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Icon
          sf={{ default: "suitcase", selected: "suitcase.fill" }}
          md="work"
        />
        <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
