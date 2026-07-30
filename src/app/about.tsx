import Constants from "expo-constants";

import { InfoScreen } from "@/components/profile/InfoScreen";

// Reached from Profile → Support → About Triply.
export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <InfoScreen
      title="About Triply"
      subtitle={`Version ${version}`}
      sections={[
        {
          heading: "What Triply does",
          body: [
            "Triply turns a sentence about a trip into a day-by-day itinerary. Describe where you want to go and what you enjoy, and it plans each day with real places rather than invented ones.",
            "Every place in a plan is looked up on a map before it reaches you, so an address you can actually walk to sits behind each suggestion.",
          ],
        },
        {
          heading: "How plans are made",
          body: [
            "Itineraries are written by Google Gemini, then checked against OpenStreetMap. Photos come from Unsplash. Because the itinerary is generated, treat opening hours, prices and travel times as a starting point and confirm anything time-sensitive yourself.",
          ],
        },
      ]}
      footer={
        "Place data © OpenStreetMap contributors, available under the Open Database License. " +
        "Photos from Unsplash, credited to their photographers wherever they appear. " +
        "Itineraries generated with Google Gemini."
      }
    />
  );
}
