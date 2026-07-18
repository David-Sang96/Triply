import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";

type AuthFieldProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  error?: string;
};

export function AuthField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoCapitalize = "none",
  error,
}: AuthFieldProps) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);

  const borderColor = error ? "#EF4444" : focused ? "#208AEF" : "#E5E7EB";
  const iconColor = error ? "#EF4444" : focused ? "#208AEF" : "#6B7280";

  return (
    <View>
      <Text className="mb-2 text-[13px] font-psemibold text-[#374151]">{label}</Text>
      <View
        className="h-[52px] flex-row items-center rounded-xl border bg-white px-3"
        style={{ borderColor, borderWidth: focused || error ? 1.5 : 1 }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
        <TextInput
          className="ml-2 flex-1 text-[15px] text-[#111827]"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#94A3B8"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1 text-[12px] text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
