import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { DestinationCard } from "@/components/home/DestinationCard";
import { useDestinations } from "@/lib/destinations";
import { colors } from "@/theme/colors";

const H_PADDING = 20; // px-5 on the list
const GUTTER = 14; // gap-3.5 between the two columns and between rows

// The full "Popular destinations" list, reached from See all on Home. Reuses
// the same ["destinations"] query the Home rail already fetched, so it opens
// with data instead of a spinner.
export default function DestinationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const destinationsQuery = useDestinations();
  const destinations = destinationsQuery.data ?? [];

  // Fixed card width instead of flex-1 inside the row: a lone card on the last
  // row then keeps the column width rather than stretching across both.
  const cardWidth = (width - H_PADDING * 2 - GUTTER) / 2;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* Header — same back/centered-title bar as the other pushed screens */}
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityLabel="Go back"
          className="h-8 w-8 items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center font-psemibold text-[17px] text-ink">
          Popular destinations
        </Text>
        {/* Balances the back button so the title stays optically centered. */}
        <View className="h-8 w-8" />
      </View>

      {destinationsQuery.isLoading ? (
        <View className="items-center pt-24">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : destinationsQuery.isError ? (
        <Pressable
          onPress={() => destinationsQuery.refetch()}
          className="mx-5 mt-2 items-center rounded-2xl border border-line bg-surface px-5 py-8 active:opacity-80"
        >
          <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
          <Text className="mt-2 font-psemibold text-[15px] text-ink">
            Couldn&apos;t load destinations
          </Text>
          <Text className="mt-1 text-center font-sans text-[13px] text-muted">
            Tap to try again.
          </Text>
        </Pressable>
      ) : destinations.length > 0 ? (
        // A FlatList rather than the ScrollView used elsewhere in the app: this
        // list is ~50 cards, and windowing keeps only the visible rows' remote
        // images mounted.
        <FlatList
          data={destinations}
          keyExtractor={(destination) => destination.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GUTTER }}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3.5 px-5"
          initialNumToRender={6}
          windowSize={7}
          ListHeaderComponent={
            <Text className="font-sans text-[13px] text-muted">
              {destinations.length}{" "}
              {destinations.length === 1 ? "destination" : "destinations"} to
              explore
            </Text>
          }
          // Breathing room under the last row. Same total as generate.tsx
          // (pb-10 + insets.bottom + 24) and for the same reasons: as a pushed
          // screen there is no tab bar underneath, and Android gesture nav
          // reports insets.bottom as 0, so the flat value carries it there while
          // a home indicator adds its own clearance on top. 50 + the list's own
          // 14 row gap = the 64 measured at ~100px of clear space on device.
          ListFooterComponent={<View style={{ height: insets.bottom + 50 }} />}
          renderItem={({ item: destination }) => (
            <View style={{ width: cardWidth }}>
              <DestinationCard
                destination={destination}
                full
                onPress={() =>
                  // Cast matches the Home screen: typed routes only learn about
                  // destination/[slug].tsx once Metro regenerates them.
                  router.push(`/destination/${destination.slug}` as Href)
                }
              />
            </View>
          )}
        />
      ) : (
        <View className="items-center px-8 pt-24">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
            <Ionicons name="compass-outline" size={30} color={colors.brand} />
          </View>
          <Text className="mt-4 font-psemibold text-[16px] text-ink">
            Nothing here yet
          </Text>
          <Text className="mt-1 text-center font-sans text-[14px] text-muted">
            Popular destinations will show up here soon.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
