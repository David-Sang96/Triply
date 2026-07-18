import { useAuth } from "@clerk/expo";
import { Redirect, Stack, type ErrorBoundaryProps } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Temporary diagnostic: show the real error on screen instead of a white blank.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      <Text className="mt-4 text-lg font-pbold text-red-600">Screen error</Text>
      <ScrollView className="mt-3 flex-1">
        <Text selectable className="text-[13px] font-psemibold text-slate-900">
          {error?.message}
        </Text>
        <Text selectable className="mt-3 text-[11px] text-slate-500">
          {error?.stack}
        </Text>
      </ScrollView>
      <Pressable
        onPress={retry}
        className="my-4 h-[48px] items-center justify-center rounded-xl bg-[#208AEF]"
      >
        <Text className="font-psemibold text-white">Retry</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// Keep already signed-in users out of the auth screens.
export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
