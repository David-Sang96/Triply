import { useClerk, useUser } from "@clerk/expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

// Placeholder — the full profile screen is built in a later phase. Sign-out is
// wired up so the account can be switched during development.
export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const name =
    user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "traveler";
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const avatarUrl = user?.imageUrl;

  const onSignOut = async () => {
    await signOut();
    router.replace("/welcome");
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <View className="px-5 pb-3 pt-2">
        <Text className="font-pbold text-[22px] text-ink">Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="items-center px-6 pt-6"
      >
        <View className="h-24 w-24 overflow-hidden rounded-full bg-brand-soft">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="person" size={44} color={colors.brand} />
            </View>
          )}
        </View>

        <Text className="mt-4 font-pbold text-[20px] text-ink">{name}</Text>
        {email ? (
          <Text className="mt-1 font-sans text-[14px] text-muted">{email}</Text>
        ) : null}

        <Text className="mt-2 text-center font-sans text-[13px] text-faint">
          More profile settings are coming soon.
        </Text>

        <Pressable
          onPress={onSignOut}
          className="mt-8 h-[52px] w-full flex-row items-center justify-center rounded-xl border border-line bg-surface active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text className="ml-2 font-psemibold text-[15px] text-error">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
