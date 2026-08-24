import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { Redirect, Stack, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import {
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";

// Route-level error boundary. This catches errors before they reach Sentry's
// root wrap, so report explicitly. Raw details are shown only in development;
// release builds show a generic message.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      <Text className="mt-4 text-lg font-pbold text-red-600">
        {t("errors.unexpectedTitle")}
      </Text>
      {__DEV__ ? (
        <ScrollView className="mt-3 flex-1">
          <Text selectable className="text-[13px] font-psemibold text-slate-900">
            {error?.message}
          </Text>
          <Text selectable className="mt-3 text-[11px] text-slate-500">
            {error?.stack}
          </Text>
        </ScrollView>
      ) : (
        <Text className="mt-3 flex-1 text-[15px] text-slate-500">
          {t("errors.unexpectedBody")}
        </Text>
      )}
      <Pressable
        onPress={retry}
        className="my-4 h-[48px] items-center justify-center rounded-xl bg-[#208AEF]"
      >
        <Text className="font-psemibold text-white">{t("common.tryAgain")}</Text>
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
