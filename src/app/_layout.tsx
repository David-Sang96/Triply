import { ClerkProvider } from "@clerk/expo";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashScreenView } from "@/components/SplashScreenView";
import { queryClient } from "@/lib/query";
import { tokenCache } from "@/lib/token-cache";

import "../../global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env file");
}

// Per-screen route transactions (Time To Initial Display). This SDK version
// predates Sentry.expoRouterIntegration(), so it's wired manually to Expo
// Router's nav ref below via registerNavigationContainer.
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

// Records a short replay leading up to a captured exception (not every
// session — see replaysOnErrorSampleRate below). Defaults to masking all
// text, images, and vectors, so no per-screen masking config is needed.
const replayIntegration = Sentry.mobileReplayIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // PII (e.g. IP address) only in development — keep it off in released builds.
  sendDefaultPii: __DEV__,
  // Sample all transactions in development, a small fraction in production.
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  // Send Sentry.logger.* calls to Sentry (see src/lib/api.ts, src/lib/trips.ts).
  enableLogs: true,
  // Capture a replay for every session that hits a captured exception, rather
  // than sampling all sessions — smaller footprint, same debugging value for
  // the common case. Scaled down in production to manage replay volume/cost
  // once real traffic exists.
  replaysOnErrorSampleRate: __DEV__ ? 1.0 : 0.5,
  // Also sample a small slice of ALL sessions (error or not) — catches UX bugs
  // that never throw (e.g. a stuck UI element), which replaysOnErrorSampleRate
  // alone would miss. Kept low: replay quota is usually a plan's tightest
  // limit, and today's traffic doesn't need more to spot a recurring issue.
  replaysSessionSampleRate: __DEV__ ? 0.1 : 0.01,
  // Merges with (doesn't replace) the default integrations, which already
  // cover app start, fetch/XHR spans, native frames, and JS stalls.
  integrations: [navigationIntegration, replayIntegration],
});

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  // The native splash (expo-splash-screen) still covers the screen at this
  // point — hideAsync only runs once the fonts are in — so this render is what
  // is revealed underneath it, already painted and using Poppins.
  if (!fontsLoaded) return <SplashScreenView />;

  return (
    // Required for react-native-gesture-handler's Swipeable (chats.tsx) to
    // reliably receive pan gestures, especially on Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#FFFFFF" },
              }}
            />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
