import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Activity, Day, TripDetail, TripImage } from "@/lib/trips";
import { useToggleTripCover, useUploadTripCover } from "@/lib/trips";
import { colors } from "@/theme/colors";

import { TripMap, type MapPlace } from "./TripMap";

const HERO_HEIGHT = 280;
const BOT_ICON = require("@/assets/images/chat-bot.png");

function MetaChip({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View className="mb-2 mr-2 flex-row items-center rounded-full border border-line bg-surface px-3 py-1.5">
      <Ionicons name={icon} size={13} color={colors.brand} />
      <Text className="ml-1.5 font-pmedium text-[12px] text-ink">{text}</Text>
    </View>
  );
}

// Swipeable photo carousel for the hero. Falls back to a placeholder when the
// trip has no images (e.g. Unsplash was unavailable at generation time).
function HeroCarousel({ images }: { images: TripImage[] }) {
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const current = images[active];

  if (images.length === 0) {
    return (
      <View
        className="w-full items-center justify-center bg-brand-soft"
        style={{ height: HERO_HEIGHT }}
      >
        <Ionicons name="image-outline" size={44} color={colors.faint} />
      </View>
    );
  }

  return (
    <View style={{ height: HERO_HEIGHT }} className="w-full">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setActive(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {images.map((img, i) => (
          <Image
            key={`${img.url}-${i}`}
            source={{ uri: img.url }}
            style={{ width, height: HERO_HEIGHT }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </ScrollView>

      <View className="absolute inset-0 bg-black/15" pointerEvents="none" />

      {/* Page dots */}
      {images.length > 1 ? (
        <View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center gap-1.5">
          {images.map((img, i) => (
            <View
              key={`dot-${img.url}-${i}`}
              className={`h-1.5 rounded-full ${
                i === active ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </View>
      ) : null}

      {/* Per-image attribution (required by Unsplash) */}
      {current ? (
        <Pressable
          onPress={() => Linking.openURL(current.unsplashUrl)}
          className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2 py-0.5 active:opacity-80"
        >
          <Text className="text-[10px] text-white/90">
            {current.photographerName} / Unsplash
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// The user's uploaded photo, shown instead of the Unsplash HeroCarousel when
// trip.useCustomCover is true. Static (no swipe, no attribution) since it's
// a single photo the user picked themselves.
function CustomCover({ url }: { url: string }) {
  return (
    <View style={{ height: HERO_HEIGHT }} className="w-full">
      <Image
        source={{ uri: `${url}?tr=w-1200,q-70` }}
        style={{ width: "100%", height: HERO_HEIGHT }}
        contentFit="cover"
        transition={200}
      />
      <View className="absolute inset-0 bg-black/15" pointerEvents="none" />
    </View>
  );
}

function ActivityRow({ activity, last }: { activity: Activity; last: boolean }) {
  return (
    <View className="flex-row">
      <View className="items-center">
        <View className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
        {last ? null : <View className="w-px flex-1 bg-line" />}
      </View>
      <View className={`ml-3 flex-1 ${last ? "" : "pb-4"}`}>
        <Text className="font-psemibold text-[11px] uppercase tracking-wide text-brand">
          {activity.timeOfDay}
        </Text>
        <Text className="mt-0.5 font-psemibold text-[15px] text-ink">
          {activity.name}
        </Text>
        {activity.description ? (
          <Text className="mt-1 font-sans text-[13px] leading-[19px] text-muted">
            {activity.description}
          </Text>
        ) : null}
        <View className="mt-1.5 flex-row items-center">
          {activity.placeName ? (
            <>
              <Ionicons
                name="location-outline"
                size={13}
                color={activity.placeVerified ? colors.success : colors.faint}
              />
              <Text className="ml-1 flex-shrink font-sans text-[12px] text-muted">
                {activity.placeName}
              </Text>
            </>
          ) : null}
          {activity.estCostUsd != null ? (
            <Text className="ml-auto pl-2 font-psemibold text-[12px] text-ink">
              {activity.estCostUsd === 0 ? "Free" : `$${activity.estCostUsd}`}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DayAccordion({
  day,
  open,
  onToggle,
}: {
  day: Day;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-line bg-surface">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center p-4 active:opacity-80"
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
          <Text className="font-pbold text-[13px] text-brand">
            {day.dayNumber}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-psemibold text-[11px] uppercase tracking-wide text-muted">
            Day {day.dayNumber}
          </Text>
          <Text className="font-psemibold text-[15px] text-ink">
            {day.themeTitle || `Day ${day.dayNumber}`}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.faint}
        />
      </Pressable>

      {open ? (
        <View className="px-4 pb-4">
          {day.activities.map((activity, i) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              last={i === day.activities.length - 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function TripDetailView({
  trip,
  onBack,
  onDelete,
  onAskAi,
  deleting,
}: {
  trip: TripDetail;
  onBack: () => void;
  onDelete: () => void;
  onAskAi: () => void;
  deleting: boolean;
}) {
  const [openDays, setOpenDays] = useState<Set<string>>(
    () => new Set(trip.days[0] ? [trip.days[0].id] : []),
  );

  const toggle = (id: string) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirmDelete = () =>
    Alert.alert(
      "Delete this trip?",
      "This permanently removes the trip and its itinerary.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    );

  const uploadCover = useUploadTripCover(trip.id);
  const toggleCover = useToggleTripCover(trip.id);
  const [coverError, setCoverError] = useState<string | null>(null);

  const pickCover = async () => {
    setCoverError(null);

    let formData: FormData;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setCoverError(
          "Allow photo access in your phone's settings to add a custom photo.",
        );
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 1,
      });
      if (picked.canceled) return;

      const compressed = await ImageManipulator.manipulateAsync(
        picked.assets[0].uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      formData = new FormData();
      formData.append("file", {
        uri: compressed.uri,
        name: "cover.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
    } catch {
      setCoverError("Couldn't open that photo. Please try again.");
      return;
    }

    uploadCover.mutate(formData, {
      onError: () =>
        setCoverError("Couldn't upload that photo. Please try again."),
    });
  };

  const toggleCoverSource = () => {
    setCoverError(null);
    toggleCover.mutate(!trip.useCustomCover, {
      onError: () =>
        setCoverError("Couldn't switch photos. Please try again."),
    });
  };

  // Prefer the multi-photo gallery; fall back to the single cover for trips
  // generated before the gallery existed.
  const images: TripImage[] =
    trip.images && trip.images.length > 0
      ? trip.images
      : trip.coverImageUrl
        ? [
            {
              url: trip.coverImageUrl,
              photographerName: trip.coverImagePhotographerName ?? "Unsplash",
              photographerUrl:
                trip.coverImagePhotographerUrl ?? "https://unsplash.com",
              unsplashUrl: trip.coverImageUnsplashUrl ?? "https://unsplash.com",
            },
          ]
        : [];

  // Only verified places (those Nominatim geocoded) can be plotted.
  const mapPlaces: MapPlace[] = trip.days.flatMap((day) =>
    day.activities
      .filter(
        (a) =>
          a.placeVerified && a.lat != null && a.lng != null && a.placeName,
      )
      .map((a) => ({
        name: a.placeName as string,
        lat: a.lat as number,
        lng: a.lng as number,
        day: day.dayNumber,
      })),
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
      >
        {/* Hero */}
        <View className="w-full" style={{ height: HERO_HEIGHT }}>
          {trip.useCustomCover && trip.customCoverImageUrl ? (
            <CustomCover url={trip.customCoverImageUrl} />
          ) : (
            <HeroCarousel images={images} />
          )}

          {/* Top actions */}
          <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-4 pt-2">
            <Pressable
              onPress={onBack}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
            >
              <Ionicons name="chevron-back" size={22} color={colors.surface} />
            </Pressable>

            <View className="flex-row items-center">
              <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40">
                <Ionicons name="heart-outline" size={20} color={colors.surface} />
              </View>
              {trip.customCoverImageUrl ? (
                <Pressable
                  onPress={toggleCoverSource}
                  disabled={toggleCover.isPending || uploadCover.isPending}
                  hitSlop={8}
                  className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={19}
                    color={colors.surface}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={pickCover}
                disabled={uploadCover.isPending || toggleCover.isPending}
                hitSlop={8}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
              >
                {uploadCover.isPending ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="camera-outline" size={19} color={colors.surface} />
                )}
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="trash-outline" size={19} color={colors.surface} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Days badge */}
          <View className="absolute bottom-4 left-4 flex-row items-center rounded-full bg-black/55 px-3 py-1">
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text className="ml-1.5 font-psemibold text-[12px] text-white">
              {trip.numDays} {trip.numDays === 1 ? "day" : "days"}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View className="px-5 pt-4">
          {coverError ? (
            <View className="mb-3 rounded-xl border border-error bg-error/10 px-3 py-2">
              <Text className="font-sans text-[13px] text-error">
                {coverError}
              </Text>
            </View>
          ) : null}
          <Text className="font-pbold text-[24px] leading-[30px] text-ink">
            {trip.title ?? trip.destination}
          </Text>
          <Text className="mt-1 font-sans text-[13px] text-muted">
            {trip.destination}
          </Text>

          <View className="mt-3 flex-row flex-wrap">
            <MetaChip
              icon="calendar-outline"
              text={`${trip.numDays} ${trip.numDays === 1 ? "day" : "days"}`}
            />
            <MetaChip
              icon="people-outline"
              text={`${trip.numTravelers} ${
                trip.numTravelers === 1 ? "traveler" : "travelers"
              }`}
            />
            <MetaChip icon="wallet-outline" text={trip.budgetLevel} />
          </View>

          {/* Ask the AI assistant about this trip */}
          <Pressable
            onPress={onAskAi}
            className="mt-3 flex-row items-center rounded-2xl border border-line bg-surface p-3 active:opacity-80"
          >
            <Image
              source={BOT_ICON}
              style={{ width: 38, height: 38, borderRadius: 19 }}
            />
            <View className="ml-3 flex-1">
              <Text className="font-psemibold text-[14px] text-ink">
                Ask AI about this trip
              </Text>
              <Text className="font-sans text-[12px] text-muted">
                Tweaks, food, packing, local tips…
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>

          {trip.summary ? (
            <>
              <Text className="mt-5 font-psemibold text-[18px] text-ink">
                Overview
              </Text>
              <Text className="mt-2 font-sans text-[14px] leading-[21px] text-muted">
                {trip.summary}
              </Text>
            </>
          ) : null}

          {mapPlaces.length > 0 ? (
            <>
              <Text className="mt-6 font-psemibold text-[18px] text-ink">
                Trip map
              </Text>
              <Text className="mt-1 font-sans text-[12px] text-muted">
                {mapPlaces.length} verified{" "}
                {mapPlaces.length === 1 ? "place" : "places"}
              </Text>
              <View className="mt-3">
                <TripMap places={mapPlaces} />
              </View>
            </>
          ) : null}

          <Text className="mt-6 font-psemibold text-[18px] text-ink">
            Daily itinerary
          </Text>
          <View className="mt-3">
            {trip.days.map((day) => (
              <DayAccordion
                key={day.id}
                day={day}
                open={openDays.has(day.id)}
                onToggle={() => toggle(day.id)}
              />
            ))}
          </View>

          <Text className="mt-4 text-center font-sans text-[11px] text-faint">
            Places via OpenStreetMap · Photos via Unsplash
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
