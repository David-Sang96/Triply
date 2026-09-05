import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import { InterestChip } from "@/components/generate/InterestChip";
import { PaceOption } from "@/components/generate/PaceOption";
import { SegmentedControl } from "@/components/generate/SegmentedControl";
import { Stepper } from "@/components/generate/Stepper";
import {
  BUDGETS,
  INTERESTS,
  MAX_INTERESTS,
  PACES,
  type Budget,
} from "@/data/generate";
import { ApiError } from "@/lib/api";
import { usePreferences } from "@/lib/preferences";
import { useCreateTrip } from "@/lib/trips";
import { colors, shadows } from "@/theme/colors";

const HORIZONTAL_PADDING = 40; // px-5 on both sides
const CHIP_GAP = 12; // gap-3 between the 3 interest columns

// Trip request form. The UI is fully interactive; the itinerary generation
// itself is wired up in a later phase.
export default function GenerateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { preferences } = usePreferences();
  const { destination: prefill, interest: interestPrefill } =
    useLocalSearchParams<{ destination?: string; interest?: string }>();

  // Pre-filled when arriving from a "Popular destinations" card
  // (destination/[slug].tsx's "Generate a trip to X" button); empty
  // otherwise, same as before.
  const [destination, setDestination] = useState(prefill ?? "");
  const [days, setDays] = useState(5);
  const [travelers, setTravelers] = useState(2);
  // Seeded from the Profile "Travel budget" preference, and only seeded — the
  // user can still change it for this one trip. A preference is a starting
  // point, not a lock, so this is deliberately the initial state rather than a
  // value synced on every render: changing the setting mid-form would otherwise
  // yank the choice out from under whoever was filling it in.
  const [budget, setBudget] = useState<Budget>(preferences.budget);
  // Pre-selected when arriving from an "AI Inspirations" tile (validated
  // against the real interest list so a bad/unknown id can't sneak in);
  // defaults to Food otherwise, same as before.
  const [interests, setInterests] = useState<string[]>(() =>
    interestPrefill && INTERESTS.some((i) => i.id === interestPrefill)
      ? [interestPrefill]
      : ["food"],
  );

  // The two initializers above only apply on first mount. This is a pushed
  // stack screen now (it used to be a tab), so it usually does remount — but
  // navigating here from a screen already showing it, e.g. tapping a
  // different destination or inspiration tile, reuses the instance and the
  // form still has to update. Adjusting state during render (comparing against
  // the last-seen param, React's documented pattern for this) rather than
  // in an effect, since `destination`/`interests` are also independently
  // user-editable — not purely derived from the params.
  const [prevPrefill, setPrevPrefill] = useState(prefill);
  if (prefill !== prevPrefill) {
    setPrevPrefill(prefill);
    setDestination(prefill ?? "");
  }

  const [prevInterestPrefill, setPrevInterestPrefill] = useState(interestPrefill);
  if (interestPrefill !== prevInterestPrefill) {
    setPrevInterestPrefill(interestPrefill);
    setInterests(
      interestPrefill && INTERESTS.some((i) => i.id === interestPrefill)
        ? [interestPrefill]
        : ["food"],
    );
  }

  const [pace, setPace] = useState("balanced");
  const [showDestError, setShowDestError] = useState(false);

  const createTrip = useCreateTrip();

  const chipWidth = (width - HORIZONTAL_PADDING - 2 * CHIP_GAP) / 3;
  const atMaxInterests = interests.length >= MAX_INTERESTS;

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, id];
    });
  };

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const onGenerate = () => {
    const trimmed = destination.trim();
    if (!trimmed) {
      setShowDestError(true);
      return;
    }
    setShowDestError(false);

    const interestLabels = INTERESTS.filter((i) =>
      interests.includes(i.id),
    ).map((i) => i.label);
    const paceLabel = PACES.find((p) => p.id === pace)?.label ?? null;

    createTrip.mutate(
      {
        destination: trimmed,
        numDays: days,
        numTravelers: travelers,
        budgetLevel: budget,
        interests: interestLabels,
        pace: paceLabel,
      },
      {
        onSuccess: ({ id }) => router.push(`/trip/${id}`),
        onError: (err) => {
          const message =
            err instanceof ApiError
              ? err.message
              : t("common.somethingWentWrong");
          Alert.alert(t("generate.startFailedTitle"), message);
        },
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={goBack}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="font-psemibold text-[17px] text-ink">
          {t("generate.headerTitle")}
        </Text>
        <View className="h-8 w-8 items-center justify-center">
          <Ionicons name="sparkles" size={20} color={colors.brand} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pb-10"
      >
        {/* Intro */}
        <Text className="mt-2 font-psemibold text-[24px] leading-[32px] text-ink">
          {t("generate.intro")}
        </Text>
        <Text className="mt-2 font-sans text-[14px] leading-[20px] text-muted">
          {t("generate.introBody")}
        </Text>

        {/* Destination */}
        <Text className="mt-6 font-psemibold text-[15px] text-ink">
          {t("generate.whereLabel")}
        </Text>
        <View
          className={`mt-2.5 h-14 flex-row items-center rounded-xl border bg-surface px-4 ${
            showDestError ? "border-error" : "border-line"
          }`}
        >
          <Ionicons name="location" size={19} color={colors.brand} />
          <TextInput
            value={destination}
            onChangeText={(t) => {
              setDestination(t);
              if (showDestError && t.trim()) setShowDestError(false);
            }}
            placeholder={t("generate.wherePlaceholder")}
            placeholderTextColor={colors.faint}
            className="ml-3 flex-1 font-sans text-[14px] text-ink"
          />
          {destination.length > 0 ? (
            <Pressable onPress={() => setDestination("")} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
        {showDestError ? (
          <Text className="mt-1.5 font-sans text-[12px] text-error">
            {t("generate.whereRequired")}
          </Text>
        ) : null}

        {/* Days */}
        <Text className="mt-6 font-psemibold text-[15px] text-ink">
          {t("generate.daysLabel")}
        </Text>
        <View className="mt-2.5">
          <Stepper value={days} min={1} max={7} onChange={setDays} helper={t("generate.daysHelper")} />
        </View>

        {/* Travelers */}
        <Text className="mt-6 font-psemibold text-[15px] text-ink">
          {t("generate.travelersLabel")}
        </Text>
        <View className="mt-2.5">
          <Stepper
            value={travelers}
            min={1}
            max={10}
            onChange={setTravelers}
            helper={t("generate.travelersHelper")}
          />
        </View>

        {/* Budget */}
        <Text className="mt-6 font-psemibold text-[15px] text-ink">
          {t("generate.budgetLabel")}
        </Text>
        <View className="mt-2.5">
          <SegmentedControl options={BUDGETS} value={budget} onChange={setBudget} />
        </View>

        {/* Interests */}
        <Text className="mt-6 font-psemibold text-[15px] text-ink">
          {t("generate.interestsLabel")}{" "}
          <Text className="text-[13px] text-brand">
            {t("generate.interestsHint", { max: MAX_INTERESTS })}
          </Text>
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-3">
          {INTERESTS.map((interest) => {
            const selected = interests.includes(interest.id);
            return (
              <InterestChip
                key={interest.id}
                interest={interest}
                selected={selected}
                disabled={!selected && atMaxInterests}
                onToggle={() => toggleInterest(interest.id)}
                width={chipWidth}
              />
            );
          })}
        </View>

        {/* Travel Pace */}
        <Text className="mt-6 font-psemibold text-[15px] text-ink">
          {t("generate.paceLabel")}
        </Text>
        <View className="mt-3">
          {PACES.map((option) => (
            <PaceOption
              key={option.id}
              pace={option}
              selected={pace === option.id}
              onSelect={() => setPace(option.id)}
            />
          ))}
        </View>

        {/* Submit */}
        <Pressable
          onPress={onGenerate}
          disabled={createTrip.isPending}
          className={`mt-6 min-h-[54px] py-2 flex-row items-center justify-center rounded-xl bg-brand active:opacity-90 ${
            createTrip.isPending ? "opacity-70" : ""
          }`}
          style={shadows.md}
        >
          {createTrip.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Ionicons name="sparkles" size={18} color={colors.surface} />
          )}
          <Text className="ml-2 font-psemibold text-[16px] text-white">
            {createTrip.isPending ? t("generate.submitting") : t("generate.submit")}
          </Text>
        </Pressable>

        <View className="mt-2.5 flex-row items-center justify-center">
          <Ionicons
            name="shield-checkmark-outline"
            size={13}
            color={colors.faint}
          />
          <Text className="ml-1.5 font-sans text-[12px] text-faint">
            {t("generate.noPayment")}
          </Text>
        </View>

        {/* Breathing room under the submit button — the tab bar used to give
            it that, and as a pushed screen nothing does. A spacer rather than
            a contentContainerStyle, which would override the NativeWind
            contentContainerClassName and drop the horizontal padding with it.
            SafeAreaView's "bottom" edge alone isn't enough either: Android
            gesture nav reports insets.bottom as 0, so the flat 24 carries it
            there, while a home indicator adds its own clearance on top. */}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
