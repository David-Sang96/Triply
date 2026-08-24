import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import {
  View,
} from "react-native";

import { Text } from "@/components/Text";
import { colors, shadows } from "@/theme/colors";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  children: ReactNode;
};

/**
 * One white card on the Profile screen: a tinted icon tile plus a blue section
 * title, then whatever rows are passed in.
 *
 * Every size here is measured from design/profile-screen.png, whose 853 x 1844
 * canvas is a 400 x 865 dp screen upscaled 2.1325x (a design pixel / 2.1325 is
 * a dp). They are written as explicit px because NativeWind treats 1rem as 14px
 * on native, so Tailwind's spacing steps land 12.5% short of their web values —
 * `h-12` is 42dp here, not 48.
 */
export function SettingsCard({ icon, title, children }: Props) {
  return (
    <View
      className="rounded-[11px] bg-surface px-[14px] pb-[4px]"
      style={shadows.sm}
    >
      {/* Header band, the same height as a row. */}
      <View className="h-[48px] flex-row items-center gap-[11px]">
        <View className="h-[32px] w-[32px] items-center justify-center rounded-[6px] bg-brand-soft">
          <Ionicons name={icon} size={17} color={colors.brand} />
        </View>
        <Text className="font-psemibold text-[14px] text-brand">{title}</Text>
      </View>

      {children}
    </View>
  );
}
