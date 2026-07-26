import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
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

import { ApiError } from "@/lib/api";
import { useConversations, useDeleteConversation, type Conversation } from "@/lib/chat";
import { colors } from "@/theme/colors";

const BOT_ICON = require("@/assets/images/chat-bot.png");

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
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
        accessibilityLabel="Delete conversation"
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
  const confirmDelete = () =>
    Alert.alert(
      "Delete this conversation?",
      "This permanently removes the conversation and its messages.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
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
              {timeAgo(conversation.updatedAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      </Swipeable>
    </View>
  );
}

// Inbox of the user's general-assistant conversations (like ChatGPT/WhatsApp).
// Trip-scoped chat isn't listed here — it stays a single thread per trip.
export default function ChatsScreen() {
  const router = useRouter();
  const conversationsQuery = useConversations();
  const conversations = conversationsQuery.data ?? [];
  const deleteConversation = useDeleteConversation();

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const onDelete = (id: string) =>
    deleteConversation.mutate(id, {
      onError: (err) =>
        Alert.alert(
          "Couldn't delete",
          err instanceof ApiError ? err.message : "Please try again.",
        ),
    });

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 py-2.5">
        <View className="flex-row items-center">
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityLabel="Go back"
            className="h-9 w-9 items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text className="ml-1 font-pbold text-[20px] text-ink">Chats</Text>
        </View>
        <Pressable
          onPress={() => router.push("/chat")}
          className="flex-row items-center rounded-full bg-brand px-3.5 py-2 active:opacity-90"
        >
          <Ionicons name="add" size={16} color={colors.surface} />
          <Text className="ml-1 font-psemibold text-[13px] text-white">
            New chat
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
            Couldn&apos;t load your chats
          </Text>
          <Pressable
            onPress={() => conversationsQuery.refetch()}
            className="mt-4 active:opacity-70"
          >
            <Text className="font-psemibold text-[14px] text-brand">Try again</Text>
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
            No conversations yet
          </Text>
          <Text className="mt-1 text-center font-sans text-[14px] text-muted">
            Ask me anything about planning your next trip.
          </Text>
          <Pressable
            onPress={() => router.push("/chat")}
            className="mt-6 h-[48px] flex-row items-center justify-center rounded-xl bg-brand px-6 active:opacity-90"
          >
            <Ionicons name="sparkles" size={16} color={colors.surface} />
            <Text className="ml-2 font-psemibold text-[15px] text-white">
              Start chatting
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
