import { useClerk, useUser } from "@clerk/expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OptionSheet } from "@/components/profile/OptionSheet";
import { SettingsCard } from "@/components/profile/SettingsCard";
import { SettingsRow } from "@/components/profile/SettingsRow";
import { useDeleteAccount } from "@/lib/account";
import { links } from "@/lib/links";
import {
  BUDGETS,
  CURRENCIES,
  LANGUAGES,
  usePreferences,
} from "@/lib/preferences";
import { colors, shadows } from "@/theme/colors";

const BG = require("@/assets/images/profile-bg.png");

// Measured from design/profile-screen.png. Its 853 x 1844 canvas is a
// 400 x 865 dp screen upscaled 2.1325x, so a design pixel / 2.1325 is a dp.
// Sizes are written as explicit px because NativeWind treats 1rem as 14px on
// native, which makes Tailwind's spacing steps 12.5% smaller than their web
// values (`h-12` is 42dp, not 48).
//
// The artwork spans the full screen width, so the palm, mountain and castle run
// off the right edge exactly as they do in the design — there is no gutter on
// either side. Only the vertical offset is a free parameter; it was solved by
// matching the balloon and the mountain peak in design/profile-screen-bg.png
// against the same features in the composed design (both land within ~7dp), and
// it is a fraction of screen WIDTH so the scene keeps its proportions.
const ART_ASPECT = 1024 / 1536; // the source artwork's own ratio
const ART_TOP_RATIO = -0.168; // 67dp above the top edge on the design's 400dp width

// bg-[#F5FAFE] below is the page tint under the artwork, sampled from the
// design's lower half.

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { preferences, update } = usePreferences();
  const deleteAccount = useDeleteAccount();

  // Which preference row's sheet is open, if any.
  const [editing, setEditing] = useState<"language" | "currency" | "budget" | null>(
    null,
  );

  const name =
    user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "traveler";
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const avatarUrl = user?.imageUrl;

  const onSignOut = async () => {
    await signOut();
    router.replace("/welcome");
  };

  // Irreversible, so it asks first. The mutation deletes the Clerk user; the
  // trips, chats and uploaded images follow via the user.deleted webhook, and
  // the device's saved preferences are cleared in the hook.
  const onDeleteAccount = () => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your trips, chats and saved preferences. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              router.replace("/welcome");
            } catch (err) {
              Alert.alert(
                "Couldn't delete your account",
                err instanceof Error
                  ? err.message
                  : "Something went wrong. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-[#F5FAFE]">
      {/* Decorative watercolour wash. Hidden from screen readers. */}
      <Image
        source={BG}
        accessible={false}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: width * ART_TOP_RATIO,
          height: width / ART_ASPECT,
        }}
        contentFit="cover"
      />

      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-[20px] pb-[12px] pt-[6px]"
        >
          <Text className="font-pbold text-[26px] text-ink">Profile</Text>

          {/* No top margin: the title's line box already leaves the 17dp the
              design has between its baseline and the avatar. */}
          <View className="flex-row items-center gap-[15px]">
            <View
              className="h-[95px] w-[95px] overflow-hidden rounded-full border-2 border-white bg-brand-soft"
              style={shadows.md}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="person" size={40} color={colors.brand} />
                </View>
              )}
            </View>

            <View className="flex-1">
              <Text className="font-pbold text-[18px] text-ink" numberOfLines={1}>
                {name}
              </Text>
              {email ? (
                <Text
                  className="mt-[2px] font-sans text-[12px] text-muted"
                  numberOfLines={1}
                >
                  {email}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="mt-[22px] gap-[15px]">
            <SettingsCard icon="options-outline" title="Preferences">
              <SettingsRow
                icon="globe-outline"
                label="Language"
                value={preferences.language}
                onPress={() => setEditing("language")}
              />
              <SettingsRow
                icon="wallet-outline"
                label="Currency"
                value={preferences.currency}
                divided
                onPress={() => setEditing("currency")}
              />
              <SettingsRow
                icon="pricetag-outline"
                label="Travel Budget"
                value={preferences.budget}
                divided
                onPress={() => setEditing("budget")}
              />
            </SettingsCard>

            <SettingsCard icon="help-buoy-outline" title="Support">
              <SettingsRow
                icon="help-circle-outline"
                label="Help Center"
                onPress={() => router.push("/help-center")}
              />
              <SettingsRow
                icon="shield-checkmark-outline"
                label="Privacy Policy"
                divided
                onPress={() => router.push("/privacy-policy")}
              />
              <SettingsRow
                icon="document-text-outline"
                label="Terms of Service"
                divided
                onPress={() => WebBrowser.openBrowserAsync(links.terms)}
              />
              <SettingsRow
                icon="information-circle-outline"
                label="About Triply"
                divided
                onPress={() => router.push("/about")}
              />
            </SettingsCard>

            <SettingsCard icon="person-outline" title="Account">
              {/* The card already adds 4dp below; the design leaves 11dp under
                  the last button. */}
              <View className="gap-[8px] pb-[7px] pt-[6px]">
                <DangerButton
                  icon="log-out-outline"
                  label="Sign Out"
                  onPress={onSignOut}
                  disabled={deleteAccount.isPending}
                />
                <DangerButton
                  icon="trash-outline"
                  label="Delete Account"
                  onPress={onDeleteAccount}
                  busy={deleteAccount.isPending}
                />
              </View>
            </SettingsCard>
          </View>
        </ScrollView>
      </SafeAreaView>

      <OptionSheet
        title={editing === "language" ? "Language" : null}
        options={LANGUAGES}
        value={preferences.language}
        onSelect={(next) => update("language", next)}
        onClose={() => setEditing(null)}
      />
      <OptionSheet
        title={editing === "currency" ? "Currency" : null}
        options={CURRENCIES}
        value={preferences.currency}
        onSelect={(next) => update("currency", next)}
        onClose={() => setEditing(null)}
      />
      <OptionSheet
        title={editing === "budget" ? "Travel Budget" : null}
        options={BUDGETS}
        value={preferences.budget}
        onSelect={(next) => update("budget", next)}
        onClose={() => setEditing(null)}
      />
    </View>
  );
}

// The two outlined red buttons in the Account card: 37dp tall, centred content.
// `busy` swaps the icon for a spinner (deletion takes a round trip); `disabled`
// only greys the button out. Both block the press, so a second tap cannot fire
// a delete that is already running.
function DangerButton({
  icon,
  label,
  onPress,
  busy,
  disabled,
}: {
  icon: "log-out-outline" | "trash-outline";
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const inactive = busy || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      className={`h-[37px] flex-row items-center justify-center gap-[7px] rounded-[6px] border border-error ${
        inactive ? "opacity-50" : "active:opacity-70"
      }`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.error} />
      ) : (
        <Ionicons name={icon} size={18} color={colors.error} />
      )}
      <Text className="font-psemibold text-[12px] text-error">
        {busy ? "Deleting…" : label}
      </Text>
    </Pressable>
  );
}
