import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UserTripCard } from "@/components/home/UserTripCard";
import { useTrips } from "@/lib/trips";
import { colors } from "@/theme/colors";

// The Trips tab: the full list of the user's generated trips.
export default function TripsScreen() {
  const router = useRouter();
  const tripsQuery = useTrips();
  const trips = tripsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <View className="px-5 pb-3 pt-2">
        <Text className="font-pbold text-[22px] text-ink">My Trips</Text>
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
            Couldn&apos;t load your trips
          </Text>
          <Text className="mt-1 text-center font-sans text-[13px] text-muted">
            Tap to try again.
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
            No trips yet
          </Text>
          <Text className="mt-1 text-center font-sans text-[14px] text-muted">
            Your planned and saved trips will show up here.
          </Text>
          <Pressable
            onPress={() => router.push("/generate")}
            className="mt-6 h-[48px] flex-row items-center justify-center rounded-xl bg-brand px-6 active:opacity-90"
          >
            <Ionicons name="sparkles" size={16} color={colors.surface} />
            <Text className="ml-2 font-psemibold text-[15px] text-white">
              Generate a trip
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
