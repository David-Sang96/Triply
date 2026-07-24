import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { DestinationDetailView } from "@/components/destination/DestinationDetailView";
import { useDestination } from "@/lib/destinations";
import { colors } from "@/theme/colors";

export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const destinationQuery = useDestination(typeof slug === "string" ? slug : "");

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  if (destinationQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!destinationQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-8">
        <Text className="text-center font-psemibold text-[15px] text-ink">
          Couldn&apos;t find that destination.
        </Text>
        <Pressable onPress={goBack} className="mt-4 active:opacity-70">
          <Text className="font-psemibold text-[14px] text-brand">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const destination = destinationQuery.data;

  return (
    <DestinationDetailView
      destination={destination}
      onBack={goBack}
      onGenerate={() =>
        router.push({
          pathname: "/generate",
          params: { destination: `${destination.name}, ${destination.country}` },
        })
      }
    />
  );
}
