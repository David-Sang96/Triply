import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import {
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import type { Destination } from "@/lib/destinations";
import { colors, shadows } from "@/theme/colors";

const HERO_HEIGHT = 280;

// Shown when a Popular destinations card is tapped. Mirrors
// TripDetailView's hero/back-button/section conventions.
export function DestinationDetailView({
  destination,
  onBack,
  onGenerate,
}: {
  destination: Destination;
  onBack: () => void;
  onGenerate: () => void;
}) {
  // Narrowed once into a local: TypeScript does not carry a null check on
  // `destination.photographerName` into the onPress closures below.
  // Unsplash's format credits the photographer and links both their profile and
  // Unsplash itself. photographerUrl is only missing on a hand-edited row, and
  // falling back to the photo page keeps a working link rather than dropping the
  // credit — which is the part their terms actually require.
  const credit =
    destination.photographerName && destination.unsplashUrl
      ? {
          name: destination.photographerName,
          photoUrl: destination.unsplashUrl,
          profileUrl: destination.photographerUrl ?? destination.unsplashUrl,
        }
      : null;

  const openLink = (url: string) =>
    // Rejects when no installed app can open the link — nothing to recover
    // from, and an unhandled rejection would warn in dev.
    void Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
      >
        {/* Hero */}
        <View className="w-full" style={{ height: HERO_HEIGHT }}>
          <Image
            source={{ uri: destination.imageUrl }}
            style={{ width: "100%", height: HERO_HEIGHT }}
            contentFit="cover"
            transition={200}
          />
          <View className="absolute inset-0 bg-black/15" pointerEvents="none" />

          {/* Top actions */}
          <View className="absolute inset-x-0 top-0 flex-row items-center px-4 pt-2">
            <Pressable
              onPress={onBack}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black active:opacity-80"
            >
              <Ionicons name="chevron-back" size={22} color={colors.surface} />
            </Pressable>
          </View>

          {/* Rating badge */}
          <View className="absolute bottom-4 left-4 flex-row items-center rounded-full bg-black/55 px-3 py-1">
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text className="ml-1.5 font-psemibold text-[12px] text-white">
              {destination.rating}
            </Text>
          </View>

          {/* Photo attribution, required by Unsplash whenever their photo is
              shown (same pill as TripDetailView). Absent on rows still using a
              placeholder photo, which has no photographer to credit. */}
          {credit ? (
            <View className="absolute bottom-4 right-4 flex-row items-center rounded-full bg-black/45 px-2 py-0.5">
              {/* hitSlop grows both targets vertically without overlapping each
                  other horizontally — the text itself is only 10px tall. */}
              <Pressable
                onPress={() => openLink(credit.profileUrl)}
                hitSlop={{ top: 10, bottom: 10, left: 4, right: 2 }}
                accessibilityRole="link"
                accessibilityLabel={`Photo by ${credit.name}, open their Unsplash profile`}
                className="active:opacity-70"
              >
                <Text className="text-[10px] text-white/90">{credit.name}</Text>
              </Pressable>
              <Text className="text-[10px] text-white/60"> / </Text>
              <Pressable
                onPress={() => openLink(credit.photoUrl)}
                hitSlop={{ top: 10, bottom: 10, left: 2, right: 4 }}
                accessibilityRole="link"
                accessibilityLabel="View this photo on Unsplash"
                className="active:opacity-70"
              >
                <Text className="text-[10px] text-white/90">Unsplash</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <View className="px-5 pt-4">
          <Text className="font-pbold text-[24px] leading-[30px] text-ink">
            {destination.name}
          </Text>
          <Text className="mt-1 font-sans text-[13px] text-muted">
            {destination.country}
          </Text>

          {destination.description ? (
            <>
              <Text className="mt-5 font-psemibold text-[18px] text-ink">
                About
              </Text>
              <Text className="mt-2 font-sans text-[14px] leading-[21px] text-muted">
                {destination.description}
              </Text>
            </>
          ) : null}

          <Pressable
            onPress={onGenerate}
            className="mt-6 h-[54px] flex-row items-center justify-center rounded-xl bg-brand active:opacity-90"
            style={shadows.md}
          >
            <Ionicons name="sparkles" size={18} color={colors.surface} />
            <Text className="ml-2 font-psemibold text-[16px] text-white">
              Generate a trip to {destination.name}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
