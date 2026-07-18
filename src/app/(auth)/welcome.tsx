import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppleButton, GoogleButton } from "@/components/SocialAuthButtons";

const BRAND_BLUE = "#208AEF";

type FeatureProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
};

function Feature({ icon, title, subtitle }: FeatureProps) {
  return (
    <View className="flex-row items-center">
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF2FE]">
        <Ionicons name={icon} size={20} color={BRAND_BLUE} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-[15px] font-psemibold text-slate-900">{title}</Text>
        <Text className="text-[13px] text-slate-500">{subtitle}</Text>
      </View>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-6"
      >
        {/* Logo */}
        <View className="mt-2 flex-row items-start justify-center">
          <Text className="text-[34px] font-pbold tracking-tight text-[#208AEF]">
            Triply
          </Text>
          <Text className="mt-1 text-lg font-pbold text-[#208AEF]">+</Text>
        </View>
        <Text className="mt-1 text-center text-[13px] text-slate-400">
          AI travel trip-planner
        </Text>

        {/* Headline */}
        <Text className="mt-4 text-center text-[26px] font-pbold leading-[31px] text-slate-900">
          Plan smarter trips{"\n"}with AI, in seconds.
        </Text>

        {/* Hero image — full image visible (matches its 380:310 ratio, no crop) */}
        <View className="mt-5 w-full overflow-hidden rounded-2xl">
          <Image
            source={require("@/assets/images/girl-backpack.png")}
            style={{ width: "100%", aspectRatio: 380 / 310 }}
            contentFit="cover"
          />
        </View>

        {/* Features */}
        <View className="mt-6">
          <Feature
            icon="sparkles"
            title="AI-powered itineraries"
            subtitle="Personalized plans in seconds."
          />
          <View className="h-4" />
          <Feature
            icon="location"
            title="Smart local recommendations"
            subtitle="Best places to eat, stay & explore."
          />
          <View className="h-4" />
          <Feature
            icon="wallet"
            title="Save time & travel better"
            subtitle="Everything you need in one place."
          />
        </View>

        {/* Primary: Sign in */}
        <Pressable
          onPress={() => router.push("/sign-in")}
          className="mt-7 h-[52px] items-center justify-center rounded-xl bg-[#208AEF] active:opacity-90"
          style={{
            shadowColor: "#101828",
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <Text className="text-base font-psemibold text-white">Sign in</Text>
        </Pressable>

        {/* Social */}
        <GoogleButton />
        <AppleButton />

        {/* Footer */}
        <View className="mt-5 flex-row items-center justify-center">
          <Text className="text-[13px] text-slate-500">New to Triply? </Text>
          <Pressable onPress={() => router.push("/sign-up")}>
            <Text className="text-[13px] font-psemibold text-[#208AEF]">Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
