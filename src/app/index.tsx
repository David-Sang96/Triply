import { useAuth, useClerk, useUser } from "@clerk/expo";
import { Redirect, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Protected home ("/"). Signed-out users are redirected to the welcome screen.
export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/welcome" />;

  const name =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "traveler";

  const onSignOut = async () => {
    await signOut();
    router.replace("/welcome");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View
        style={{ flex: 1 }}
        className="items-center justify-center px-6"
      >
        <Text className="text-center text-[26px] font-pbold text-slate-900">
          Welcome, {name} 👋
        </Text>
        <Text className="mt-2 text-center text-[15px] text-slate-500">
          You&apos;re signed in. Trip planning comes next.
        </Text>

        <Pressable
          onPress={onSignOut}
          className="mt-8 h-[52px] w-full items-center justify-center rounded-xl bg-[#208AEF] active:opacity-90"
        >
          <Text className="text-base font-psemibold text-white">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
