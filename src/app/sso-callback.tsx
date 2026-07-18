import { ActivityIndicator, View } from "react-native";

// Landing route for the Clerk OAuth redirect (triply://sso-callback).
// The SSO flow itself completes inside the GoogleButton handler (setActive +
// redirect to "/"); this route just catches the deep link so Expo Router
// doesn't flash its "Unmatched Route" screen while the browser closes.
export default function SSOCallback() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
      }}
    >
      <ActivityIndicator size="large" color="#208AEF" />
    </View>
  );
}
