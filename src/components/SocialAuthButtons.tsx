import { useSSO } from "@clerk/expo";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

/**
 * "Continue with Google" — browser SSO via Clerk `useSSO`.
 * Works on Android/iOS/web with no Google Cloud client setup; the provider
 * just needs to be enabled in Clerk Dashboard → Social connections.
 */
export function GoogleButton() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
      // No session + no error → user cancelled; do nothing.
    } catch (err) {
      Alert.alert("Google sign-in failed", "Please try again.");
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className="mt-3 h-[52px] flex-row items-center justify-center rounded-xl border border-slate-200 bg-white active:opacity-70"
    >
      <Image
        source={require("@/assets/images/google-logo.png")}
        style={{ width: 20, height: 20 }}
        contentFit="contain"
      />
      <Text className="ml-3 text-base font-psemibold text-slate-800">
        Continue with Google
      </Text>
    </Pressable>
  );
}

/**
 * "Continue with Apple" — placeholder only.
 * Configuring the Apple provider in Clerk needs an Apple Developer account
 * (Services ID + key), so this stays non-functional for now.
 */
export function AppleButton() {
  return (
    <Pressable
      onPress={() =>
        Alert.alert(
          "Coming soon",
          "Apple sign-in needs an Apple Developer account and isn't set up yet.",
        )
      }
      className="mt-3 h-[52px] flex-row items-center justify-center rounded-xl border border-slate-200 bg-white active:opacity-70"
    >
      <Ionicons name="logo-apple" size={20} color="#000000" />
      <Text className="ml-3 text-base font-psemibold text-slate-800">
        Continue with Apple
      </Text>
    </Pressable>
  );
}
