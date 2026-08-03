import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { colors } from "@/theme/colors";

// How long to wait for a session before assuming the flow did not complete.
// The happy path is fast — the browser closes, GoogleButton calls setActive and
// replaces the route — so this only ever fires when nothing is coming.
const GIVE_UP_MS = 5000;

// Landing route for the Clerk OAuth redirect (triply://sso-callback).
//
// On success the SSO flow completes inside the GoogleButton handler (setActive
// + replace to "/"), and this screen is only ever a brief flash while the
// browser closes.
//
// It also has to handle the unhappy path. Cancelling on Google's own consent
// page is not a dismissed browser: Google redirects back through Clerk into
// this route, so it mounts with no session on the way. Previously it rendered
// a spinner and nothing else, with no exit — the app sat here forever and the
// only way out was to kill it. So bounce back to the auth screen once it is
// clear no session is arriving.
export default function SSOCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // Belt and braces: GoogleButton normally navigates first, but if this
    // screen is still mounted with a live session, send it home rather than
    // stranding the user on a spinner.
    if (isSignedIn) {
      router.replace("/");
      return;
    }

    const timer = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/welcome");
    }, GIVE_UP_MS);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, router]);

  return (
    // Inline flex rather than className="flex-1", which has collapsed
    // full-screen containers to zero height in this project (SplashScreenView
    // does the same for the same reason).
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
      }}
    >
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}
