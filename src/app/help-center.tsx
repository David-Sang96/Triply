import { InfoScreen } from "@/components/profile/InfoScreen";

// Reached from Profile → Support → Help Center.
export default function HelpCenterScreen() {
  return (
    <InfoScreen
      title="Help Center"
      sections={[
        {
          heading: "Generating a trip",
          body: [
            "Tap Generate, then tell Triply where you want to go, how many days you have, who is coming and what you enjoy. Triply writes a day-by-day plan and checks each place on a map before showing it to you.",
            "Generation usually takes under a minute. You can leave the screen while it runs — the trip appears in Trips when it is ready.",
          ],
        },
        {
          heading: "Why did a trip fail?",
          body: [
            "A trip can fail if the destination is too vague, or if a service Triply depends on is briefly unavailable. Failed trips do not count towards your trip limit, so tap Retry and try again.",
            "If the same destination keeps failing, try adding the country — for example \"Bagan, Myanmar\" instead of \"Bagan\".",
          ],
        },
        {
          heading: "Editing a plan",
          body: [
            "Open a trip and use Ask AI about this trip to change the pace, swap an activity or ask about opening hours. You can also replace the cover photo with one of your own.",
          ],
        },
        {
          heading: "Preferences",
          body: [
            "Language, currency and travel budget are set in Profile → Preferences. They are stored on this device and are used as the starting point for new trips.",
          ],
        },
        {
          heading: "Still stuck?",
          body: [
            "Email tyee834@gmail.com with a short description of what happened and roughly when. That is enough for us to find the matching error report.",
          ],
        },
      ]}
    />
  );
}
