import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
// The `Swipeable` exported from the package barrel is deprecated in favour of
// this Reanimated-backed one, which this project can use directly (Reanimated
// is already a dependency).
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/Text";
import { ApiError } from "@/lib/api";
import { useConversations, useDeleteConversation, type Conversation } from "@/lib/chat";
import { colors } from "@/theme/colors";

const BOT_ICON = require("@/assets/images/chat-bot.png");

// Takes `t` rather than calling a hook — it is a plain function, and every
// branch is user-facing.
//
// The final branch keeps toLocaleDateString() with no explicit locale, so it
// follows the DEVICE, not the app language. Passing "my" would depend on
// Hermes carrying Myanmar date data, and a wrong-but-plausible date is worse
// than one formatted the way the rest of the phone formats dates.
function timeAgo(iso: string, t: TFunction): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("time.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t("time.daysAgo", { count: day });
  return new Date(iso).toLocaleDateString();
}

const DELETE_ACTION_WIDTH = 64;

// Revealed by swiping a row left. `progress` is 0 when closed and 1 when fully
// open, so the button slides in from off-screen as the row moves.
function DeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (1 - Math.min(progress.value, 1)) * DELETE_ACTION_WIDTH },
    ],
  }));

  return (
    <Reanimated.View
      style={[
        { width: DELETE_ACTION_WIDTH, marginLeft: 8, justifyContent: "center" },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel={t("assistant.deleteConversationA11y")}
        className="h-full w-full items-center justify-center rounded-2xl bg-error active:opacity-80"
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      </Pressable>
    </Reanimated.View>
  );
}

function ConversationRow({
  conversation,
  onPress,
  onDelete,
}: {
  conversation: Conversation;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const confirmDelete = () =>
    Alert.alert(
      t("assistant.deleteConversationTitle"),
      t("assistant.deleteConversationBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: onDelete },
      ],
    );

  return (
    <View className="mb-2.5">
      <Swipeable
        renderRightActions={(progress, _translation, methods) => (
          <DeleteAction
            progress={progress}
            onPress={() => {
              // Snap the row shut before the dialog appears, so cancelling
              // doesn't leave it stuck open.
              methods.close();
              confirmDelete();
            }}
          />
        )}
        rightThreshold={40}
      >
        <Pressable
          onPress={onPress}
          onLongPress={confirmDelete}
          className="flex-row items-center rounded-2xl border border-line bg-surface p-3 active:opacity-80"
        >
          <Image
            source={BOT_ICON}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
          <View className="ml-3 flex-1">
            <Text className="font-psemibold text-[15px] text-ink" numberOfLines={1}>
              {conversation.title}
            </Text>
            <Text className="mt-0.5 font-sans text-[12px] text-muted">
              {timeAgo(conversation.updatedAt, t)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      </Swipeable>
    </View>
  );
}

// The Assistant tab: an inbox of the user's general-assistant conversations
// (like ChatGPT/WhatsApp). Opening one pushes /chat, which lives outside the
// (tabs) group and so covers the tab bar. Trip-scoped chat isn't listed here —
// it stays a single thread per trip, reached from the trip itself.
export default function AssistantScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const conversationsQuery = useConversations();
  const conversations = conversationsQuery.data ?? [];
  const deleteConversation = useDeleteConversation();

  const onDelete = (id: string) =>
    deleteConversation.mutate(id, {
      onError: (err) =>
        Alert.alert(
          t("assistant.deleteFailed"),
          err instanceof ApiError ? err.message : t("assistant.pleaseTryAgain"),
        ),
    });

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 py-2.5">
        {/* No back button — this is a tab root, not a pushed screen. */}
        <Text className="ml-2 font-pbold text-[20px] text-ink">
          {t("assistant.title")}
        </Text>
        <Pressable
          onPress={() => router.push("/chat")}
          className="flex-row items-center rounded-full bg-brand px-3.5 py-2 active:opacity-90"
        >
          <Ionicons name="add" size={16} color={colors.surface} />
          <Text className="ml-1 font-psemibold text-[13px] text-white">
            {t("assistant.newChat")}
          </Text>
        </Pressable>
      </View>

      {conversationsQuery.isLoading ? (
        <View className="items-center pt-24">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : conversationsQuery.isError ? (
        <View className="items-center px-8 pt-24">
          <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
          <Text className="mt-2 font-psemibold text-[15px] text-ink">
            {t("assistant.loadError")}
          </Text>
          <Pressable
            onPress={() => conversationsQuery.refetch()}
            className="mt-4 active:opacity-70"
          >
            <Text className="font-psemibold text-[14px] text-brand">
              {t("common.tryAgain")}
            </Text>
          </Pressable>
        </View>
      ) : conversations.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-4 pb-6 pt-1"
        >
          {conversations.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              onPress={() =>
                router.push({ pathname: "/chat", params: { conversationId: c.id } })
              }
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <View className="items-center px-8 pt-24">
          <Image
            source={BOT_ICON}
            style={{ width: 64, height: 64, borderRadius: 32 }}
          />
          <Text className="mt-4 font-psemibold text-[16px] text-ink">
            {t("assistant.emptyTitle")}
          </Text>
          <Text className="mt-1 text-center font-sans text-[14px] text-muted">
            {t("assistant.emptyBody")}
          </Text>
          <Pressable
            onPress={() => router.push("/chat")}
            className="mt-6 h-[48px] flex-row items-center justify-center rounded-xl bg-brand px-6 active:opacity-90"
          >
            <Ionicons name="sparkles" size={16} color={colors.surface} />
            <Text className="ml-2 font-psemibold text-[15px] text-white">
              {t("assistant.startChatting")}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
