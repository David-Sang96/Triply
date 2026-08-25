import { useSSO } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";

/**
 * "Continue with Google" — browser SSO via Clerk `useSSO`.
 * Works on Android/iOS/web with no Google Cloud client setup; the provider
 * just needs to be enabled in Clerk Dashboard → Social connections.
 */
export function GoogleButton() {
  const { t } = useTranslation();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Spans the whole native browser round-trip (SSO + session activation) —
      // a multi-step flow the automatic fetch/XHR instrumentation never sees.
      await Sentry.startSpan(
        { name: "Google sign-in", op: "auth.sso" },
        async () => {
          const { createdSessionId, setActive } = await startSSOFlow({
            strategy: "oauth_google",
          });
          if (createdSessionId && setActive) {
            await setActive({ session: createdSessionId });
            router.replace("/");
          }
          // No session + no error → user cancelled; do nothing.
        },
      );
    } catch (err) {
      Alert.alert("Google sign-in failed", "Please try again.");
      // Fixed category, not the raw error/exception message — same policy as
      // src/lib/api.ts, src/lib/chat.ts, src/lib/trips.ts.
      Sentry.logger.error("Google sign-in failed", { failure_kind: "sso_failed" });
      // Also log the real error to the device log. Discarding it made a
      // production failure undiagnosable: the alert says "please try again",
      // Sentry carries only the category, and `adb logcat` had nothing — so the
      // cause (an empty mobile SSO redirect allowlist on the production Clerk
      // instance) had to be guessed. console.error stays on the device and is
      // not telemetry, so the AGENTS.md rule against sending exception text to
      // Sentry does not apply.
      console.error("Google sign-in failed:", err);
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
        {t("auth.continueWithGoogle")}
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
  const { t } = useTranslation();
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
        {t("auth.continueWithApple")}
      </Text>
    </Pressable>
  );
}
