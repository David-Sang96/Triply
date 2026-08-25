import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";

import { PhotoScrim, PILL_ON_PHOTO } from "@/components/PhotoScrim";
import { Text } from "@/components/Text";
import type { TripListItem } from "@/lib/trips";
import { colors } from "@/theme/colors";

const IN_PROGRESS = ["queued", "generating", "enriching", "imaging", "finalizing"];

// Home "Your trips" card backed by real data. Tapping opens the trip screen,
// which shows the loading steps if it is still generating.
export function UserTripCard({
  trip,
  onPress,
  full,
}: {
  trip: TripListItem;
  onPress: () => void;
  /** Full-width card for a vertical list (Trips tab); default is a fixed-width
   * card for the Home horizontal rail. */
  full?: boolean;
}) {
  const { t } = useTranslation();
  const generating = IN_PROGRESS.includes(trip.status);
  const failed = trip.status === "failed";

  // Same active-cover choice as the trip detail screen: the custom upload
  // when the trip has one turned on, otherwise the original Unsplash cover.
  const coverUrl =
    trip.useCustomCover && trip.customCoverImageUrl
      ? `${trip.customCoverImageUrl}?tr=w-480,q-70`
      : trip.coverImageUrl;

  return (
    <Pressable
      onPress={onPress}
      className={`h-[190px] overflow-hidden rounded-2xl active:opacity-90 ${
        full ? "w-full" : "w-[240px]"
      }`}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View className="h-full w-full bg-line" />
      )}
      <PhotoScrim />

      <View className="absolute left-3 top-3 flex-row items-center rounded-full px-2.5 py-1" style={PILL_ON_PHOTO}>
        <Ionicons name="star" size={11} color={colors.warning} />
        <Text className="ml-1 font-psemibold text-[11px] text-white">
          {t("trip.days", { count: trip.numDays })}
        </Text>
      </View>

      {generating ? (
        <View className="absolute right-3 top-3 flex-row items-center rounded-full px-2.5 py-1" style={PILL_ON_PHOTO}>
          <ActivityIndicator size="small" color={colors.surface} />
          <Text className="ml-1.5 font-psemibold text-[11px] text-white">
            {t("trip.generating")}
          </Text>
        </View>
      ) : null}
      {failed ? (
        <View className="absolute right-3 top-3 rounded-full bg-error px-2.5 py-1">
          <Text className="font-psemibold text-[11px] text-white">
            {t("trip.failed")}
          </Text>
        </View>
      ) : null}

      <View className="absolute inset-x-0 bottom-0 p-3.5">
        <Text className="font-pbold text-[16px] text-white" numberOfLines={1}>
          {trip.title ?? trip.destination}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Ionicons name="people" size={12} color={colors.surface} />
          <Text className="ml-1 font-pmedium text-[11px] text-white/90">
            {t("trip.travelers", { count: trip.numTravelers })}
          </Text>
          <Text className="mx-1.5 text-[11px] text-white/70">•</Text>
          <Text className="font-pmedium text-[11px] text-white/90">
            {t(`budget.${trip.budgetLevel}` as "budget.Budget")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
