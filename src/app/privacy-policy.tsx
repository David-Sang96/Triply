import { InfoScreen } from "@/components/profile/InfoScreen";
import { links } from "@/lib/links";

// Reached from Profile → Support → Privacy Policy.
//
// A summary, sized for a phone screen. The full policy is the published web page
// (legal/public/privacy.html) that the link at the bottom opens — Google Play
// requires a privacy policy both in the store listing and inside the app.
// Keep the two in agreement: if what the app stores changes, both need editing.
export default function PrivacyPolicyScreen() {
  return (
    <InfoScreen
      title="Privacy Policy"
      link={{ label: "Read the full Privacy Policy", url: links.privacy }}
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
            "Trip descriptions are sent to Google Gemini to write the itinerary, and place names are sent to Photon, an OpenStreetMap-based service, to look up coordinates. Neither request includes your name, email address or account id.",
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
            "You can sign out at any time from Profile → Account, and delete your account from the same place. Deleting removes your trips, days and activities, your assistant conversations, any photos you uploaded, and the preferences stored on your device. It cannot be undone.",
            "You can also delete a single message, a whole conversation, or one trip without closing your account.",
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
