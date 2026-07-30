import { InfoScreen } from "@/components/profile/InfoScreen";

// Reached from Profile → Support → Privacy Policy.
//
// This copy describes what the app actually does today, but it is a draft and
// has not been through legal review — the subtitle says so on screen. Replace
// it (and the contact address) before any public release.
export default function PrivacyPolicyScreen() {
  return (
    <InfoScreen
      title="Privacy Policy"
      subtitle="Draft — pending legal review"
      sections={[
        {
          heading: "What we store",
          body: [
            "Your account details come from your sign-in provider: name, email address and profile picture. Triply also stores the trips you generate, the messages you send to the assistant, and any cover photo you upload.",
            "Your language, currency and travel budget preferences stay on this device and are not sent to our servers.",
          ],
        },
        {
          heading: "What we send to other services",
          body: [
            "Trip descriptions are sent to Google Gemini to write the itinerary, and place names are sent to OpenStreetMap to look up coordinates. Neither request includes your name, email address or account id.",
            "Photos are searched on Unsplash and delivered through ImageKit. Uploaded images are stored by ImageKit.",
          ],
        },
        {
          heading: "Crash and performance reports",
          body: [
            "Triply uses Sentry to record errors and slow screens. These reports carry ids, counts and fixed category labels rather than message text, so they do not include your email address or the contents of your trips.",
            "One exception: conversations with the assistant are recorded with their reports, because that is the only way to debug a bad answer.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can sign out at any time from Profile → Account. Account deletion is being built; until it ships, email the address below and we will remove your data.",
          ],
        },
        {
          heading: "Contact",
          body: ["Questions about this policy: privacy@triply.app."],
        },
      ]}
    />
  );
}
