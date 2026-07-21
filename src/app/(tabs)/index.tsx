import { useUser } from "@clerk/expo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DestinationCard } from "@/components/home/DestinationCard";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { InspirationPill } from "@/components/home/InspirationPill";
import { SectionHeader } from "@/components/home/SectionHeader";
import { UserTripCard } from "@/components/home/UserTripCard";
import { DESTINATIONS, INSPIRATIONS } from "@/data/home";
import { useTrips } from "@/lib/trips";
import { colors, shadows } from "@/theme/colors";

const BOT_ICON = require("@/assets/images/chat-bot.png");

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const tripsQuery = useTrips();

  const firstName = user?.firstName ?? "David";
  const avatarUrl = user?.imageUrl;
  const trips = tripsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
          <View className="flex-row items-start">
            <Text className="font-pbold text-[26px] tracking-tight text-brand">
              Triply
            </Text>
            <Text className="mt-0.5 font-pbold text-[14px] text-brand">+</Text>
          </View>

          <View className="flex-row items-center">
            <Pressable hitSlop={8} className="mr-3 active:opacity-70">
              <Ionicons
                name="notifications-outline"
                size={24}
                color={colors.ink}
              />
            </Pressable>
            <View className="h-10 w-10 overflow-hidden rounded-full bg-line">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="person" size={20} color={colors.muted} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Hero carousel */}
        <View className="px-5">
          <HeroCarousel
            name={firstName}
            onGenerate={() => router.push("/generate")}
          />
        </View>

        {/* Your trips */}
        <View className="mt-6 px-5">
          <SectionHeader title="Your trips" onSeeAll={() => router.push("/trips")} />
        </View>
        {tripsQuery.isLoading ? (
          <View className="h-[190px] items-center justify-center">
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : tripsQuery.isError ? (
          <Pressable
            onPress={() => tripsQuery.refetch()}
            className="mx-5 mt-3.5 items-center rounded-2xl border border-line bg-surface px-5 py-6 active:opacity-80"
          >
            <Ionicons name="cloud-offline-outline" size={26} color={colors.muted} />
            <Text className="mt-2 font-psemibold text-[14px] text-ink">
              Couldn&apos;t load your trips
            </Text>
            <Text className="mt-1 text-center font-sans text-[12px] text-muted">
              {tripsQuery.error instanceof Error
                ? tripsQuery.error.message
                : "Tap to try again."}
            </Text>
          </Pressable>
        ) : trips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3.5 px-5 pt-3.5"
          >
            {trips.map((trip) => (
              <UserTripCard
                key={trip.id}
                trip={trip}
                onPress={() => router.push(`/trip/${trip.id}`)}
              />
            ))}
          </ScrollView>
        ) : (
          <Pressable
            onPress={() => router.push("/generate")}
            className="mx-5 mt-3.5 items-center rounded-2xl border border-dashed border-line bg-surface px-5 py-8 active:opacity-80"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
              <Ionicons name="add" size={26} color={colors.brand} />
            </View>
            <Text className="mt-3 font-psemibold text-[15px] text-ink">
              No trips yet
            </Text>
            <Text className="mt-1 text-center font-sans text-[13px] text-muted">
              Tap to generate your first AI trip plan.
            </Text>
          </Pressable>
        )}

        {/* Popular destinations */}
        <View className="mt-6 px-5">
          <SectionHeader title="Popular destinations" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-5 pt-3.5"
        >
          {DESTINATIONS.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </ScrollView>
        {/* Page dots */}
        <View className="mt-3 flex-row items-center justify-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-brand" />
          <View className="h-1.5 w-1.5 rounded-full bg-line" />
          <View className="h-1.5 w-1.5 rounded-full bg-line" />
        </View>

        {/* AI Inspirations */}
        <View className="mt-6 px-5">
          <Text className="font-psemibold text-[20px] leading-[28px] text-ink">
            AI Inspirations
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-5 pt-3.5"
        >
          {INSPIRATIONS.map((item) => (
            <InspirationPill key={item.id} item={item} />
          ))}
        </ScrollView>
      </ScrollView>

      {/* Floating chat assistant */}
      <Pressable
        onPress={() => router.push("/chats")}
        className="absolute bottom-5 right-5 h-[58px] w-[58px] rounded-full active:opacity-90"
        style={shadows.lg}
      >
        <Image
          source={BOT_ICON}
          style={{ width: 58, height: 58, borderRadius: 29 }}
        />
      </Pressable>
    </SafeAreaView>
  );
}
