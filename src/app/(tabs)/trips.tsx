import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import { UserTripCard } from "@/components/home/UserTripCard";
import { useTrips } from "@/lib/trips";
import { colors } from "@/theme/colors";

// The Trips tab: the full list of the user's generated trips.
export default function TripsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const tripsQuery = useTrips();
  const trips = tripsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <View className="px-5 pb-3 pt-2">
        <Text className="font-pbold text-[22px] text-ink">{t("trips.title")}</Text>
        {/* Count only once the list is actually known — showing "0 trips"
            while loading or after a failed fetch would be a lie. */}
        {tripsQuery.isSuccess ? (
          <Text className="mt-0.5 font-sans text-[13px] text-muted">
            {t("trips.count", { count: trips.length })}
          </Text>
        ) : null}
      </View>

      {tripsQuery.isLoading ? (
        <View className="items-center pt-24">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : tripsQuery.isError ? (
        <Pressable
          onPress={() => tripsQuery.refetch()}
          className="mx-5 mt-2 items-center rounded-2xl border border-line bg-surface px-5 py-8 active:opacity-80"
        >
          <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
          <Text className="mt-2 font-psemibold text-[15px] text-ink">
            {t("home.tripsLoadError")}
          </Text>
          <Text className="mt-1 text-center font-sans text-[13px] text-muted">
            {t("home.tapToTryAgain")}
          </Text>
        </Pressable>
      ) : trips.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3.5 px-5 pb-6 pt-1"
        >
          {trips.map((trip) => (
            <UserTripCard
              key={trip.id}
              trip={trip}
              full
              onPress={() => router.push(`/trip/${trip.id}`)}
            />
          ))}
        </ScrollView>
      ) : (
        <View className="items-center px-8 pt-24">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
            <Ionicons name="briefcase-outline" size={30} color={colors.brand} />
          </View>
          <Text className="mt-4 font-psemibold text-[16px] text-ink">
            {t("trips.emptyTitle")}
          </Text>
          <Text className="mt-1 text-center font-sans text-[14px] text-muted">
            {t("trips.emptyBody")}
          </Text>
          <Pressable
            onPress={() => router.push("/generate")}
            className="mt-6 min-h-[48px] py-2 flex-row items-center justify-center rounded-xl bg-brand px-6 active:opacity-90"
          >
            <Ionicons name="sparkles" size={16} color={colors.surface} />
            <Text className="ml-2 font-psemibold text-[15px] text-white">
              {t("trip.generateATrip")}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
