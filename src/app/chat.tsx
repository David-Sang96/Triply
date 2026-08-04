import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/lib/api";
import { useChatHistory, useDeleteMessage, useSendChat } from "@/lib/chat";
import { colors } from "@/theme/colors";

const NEW_CHAT_GREETING =
  "Hi! I'm your Triply travel assistant. Ask me anything about planning a trip.";

const BOT_ICON = require("@/assets/images/chat-bot.png");

type DisplayMessage = { id: string; role: "user" | "assistant"; content: string };

// `onLongPress` is undefined for the synthetic greeting and the optimistic
// pending bubble — neither has a persisted row (and therefore no turn) to
// delete. Pressable with an undefined onLongPress simply does nothing.
function Bubble({
  message,
  onLongPress,
}: {
  message: DisplayMessage;
  onLongPress?: () => void;
}) {
  if (message.role === "user") {
    return (
      <View className="mb-3 flex-row justify-end">
        <Pressable
          onLongPress={onLongPress}
          className="max-w-[82%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 active:opacity-90"
        >
          <Text className="font-sans text-[15px] leading-[21px] text-white">
            {message.content}
          </Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View className="mb-3 flex-row items-end">
      <Image
        source={BOT_ICON}
        style={{ width: 26, height: 26, borderRadius: 13 }}
      />
      <Pressable
        onLongPress={onLongPress}
        className="ml-2 max-w-[82%] rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 active:opacity-90"
      >
        <Text className="font-sans text-[15px] leading-[21px] text-ink">
          {message.content}
        </Text>
      </Pressable>
    </View>
  );
}

// Three dots that bounce in a wave, one after another (iMessage/WhatsApp-style
// "typing…" indicator) instead of a plain spinner.
function TypingDots() {
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay((dots.length - 1 - i) * 150),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots]);

  return (
    <View className="flex-row items-center gap-1">
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.muted,
            opacity: dot.interpolate({
              inputRange: [0, 1],
              outputRange: [0.35, 1],
            }),
            transform: [
              {
                translateY: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function TypingBubble() {
  return (
    <View className="mb-3 flex-row items-end">
      <Image
        source={BOT_ICON}
        style={{ width: 26, height: 26, borderRadius: 13 }}
      />
      <View className="ml-2 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3.5">
        <TypingDots />
      </View>
    </View>
  );
}

// A lasting, in-context failure indicator (not a dismissible modal) — the
// user's message is already saved server-side even when the reply fails, so
// Retry just resends the same text as a new turn.
function FailedBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="mb-3 items-center">
      <View className="max-w-[90%] flex-row items-center rounded-xl border border-error bg-error/10 px-3 py-2">
        <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
        <Text className="ml-2 flex-1 font-sans text-[13px] text-error">
          {message}
        </Text>
        <Pressable onPress={onRetry} hitSlop={8} className="ml-2 active:opacity-70">
          <Text className="font-psemibold text-[13px] text-error underline">
            Retry
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { tripId, dest, conversationId } = useLocalSearchParams<{
    tripId?: string;
    dest?: string;
    conversationId?: string;
  }>();
  const router = useRouter();

  const threadRef = { tripId: tripId ?? null, conversationId: conversationId ?? null };
  const history = useChatHistory(threadRef);
  const sendChat = useSendChat(threadRef);
  const deleteMessage = useDeleteMessage(threadRef);

  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  // Shown immediately on send, before the server confirms it (removed once the
  // persisted thread includes it).
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null);
  // How many persisted messages existed when this send started — matching
  // tail content alone isn't enough to confirm THIS send landed, since an
  // earlier turn with the exact same text (e.g. sending "hi" twice) can
  // already sit at the tail before the new turn is saved.
  const [pendingBaselineCount, setPendingBaselineCount] = useState(0);
  // Set when a reply fails; the user's message is already saved server-side
  // (only the reply is missing), so Retry just resends it as a new turn.
  const [failed, setFailed] = useState<{ text: string; message: string } | null>(
    null,
  );

  // Manual keyboard tracking instead of KeyboardAvoidingView — on this stack
  // (RN 0.86 new-arch + NativeWind) KeyboardAvoidingView renders a blank
  // screen. Shifting the input row up by the keyboard height works around it.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      // On Android, `endCoordinates.height` can undercount by the height of
      // Gboard's suggestion/toolbar strip. `screenY` (the true top edge of the
      // whole IME window) gives the exact gap to the bottom of the screen.
      const screenHeight = Dimensions.get("window").height;
      const fromScreenY = screenHeight - e.endCoordinates.screenY;
      setKeyboardHeight(Math.max(fromScreenY, e.endCoordinates.height));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const persisted = history.data ?? [];
  // Once the persisted thread includes this message, drop the optimistic
  // bubble instead of rendering a duplicate (computed at render time — no
  // effect needed). The server saves the user message and the assistant
  // reply together in one request, so by the time history refetches, the
  // user message is usually the second-to-last entry (the reply is last) —
  // check both spots. Requiring the history to have actually grown past
  // pendingBaselineCount (not just tail content matching) avoids confirming
  // against an earlier turn with the exact same text, still sitting at the
  // tail, before this send's own turn has landed.
  const lastPersisted = persisted[persisted.length - 1];
  const secondLastPersisted = persisted[persisted.length - 2];
  const pendingConfirmed =
    pendingUserMsg != null &&
    persisted.length > pendingBaselineCount &&
    ((lastPersisted?.role === "user" && lastPersisted.content === pendingUserMsg) ||
      (lastPersisted?.role === "assistant" &&
        secondLastPersisted?.role === "user" &&
        secondLastPersisted.content === pendingUserMsg));

  const greeting = tripId
    ? `Hi! I'm your Triply assistant. Ask me anything about your ${
        dest ?? "trip"
      } — tweaks, food, packing, or local tips.`
    : NEW_CHAT_GREETING;

  const showGreeting = !history.isLoading && persisted.length === 0;

  const items: DisplayMessage[] = [
    ...(showGreeting
      ? [{ id: "greeting", role: "assistant" as const, content: greeting }]
      : []),
    ...persisted,
    ...(pendingUserMsg && !pendingConfirmed
      ? [{ id: "pending", role: "user" as const, content: pendingUserMsg }]
      : []),
  ];

  const doSend = (text: string) => {
    setPendingUserMsg(text);
    setPendingBaselineCount(persisted.length);
    setFailed(null);

    sendChat.mutate(text, {
      onSuccess: (data) => {
        // A brand-new general chat just got its real id — adopt it so
        // subsequent messages and a re-focus load the same conversation.
        if (data.conversationId && !conversationId && !tripId) {
          router.setParams({ conversationId: data.conversationId });
        }
      },
      onError: (err) => {
        setPendingUserMsg(null);
        setFailed({
          text,
          message: err instanceof ApiError ? err.message : "Couldn't get a reply.",
        });
      },
    });
  };

  const send = () => {
    const text = input.trim();
    if (!text || sendChat.isPending) return;
    setInput("");
    doSend(text);
  };

  const retry = () => {
    if (failed) doSend(failed.text);
  };

  // Deletes the whole turn the message belongs to — the server resolves the
  // pair by turnId, so tapping either the question or the reply removes both.
  const confirmDeleteMessage = (messageId: string) =>
    Alert.alert(
      "Delete this message?",
      "This removes both your question and the reply.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteMessage.mutate(messageId, {
              onError: (err) =>
                Alert.alert(
                  "Couldn't delete",
                  err instanceof ApiError ? err.message : "Please try again.",
                ),
            }),
        },
      ],
    );

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const startNewChat = () => router.replace("/chat");

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className="bg-canvas"
      edges={keyboardHeight > 0 ? ["top"] : ["top", "bottom"]}
    >
      {/* Header */}
      <View className="flex-row items-center border-b border-line px-3 py-2.5">
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center active:opacity-70"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Image
          source={BOT_ICON}
          style={{ width: 34, height: 34, borderRadius: 17 }}
        />
        <View className="ml-2.5 flex-1">
          <Text className="font-psemibold text-[16px] text-ink">
            Triply Assistant
          </Text>
          <Text className="font-sans text-[11px] text-muted">
            {tripId ? "About your trip" : "Your travel helper"}
          </Text>
        </View>
        {!tripId ? (
          <Pressable
            onPress={startNewChat}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center active:opacity-70"
          >
            <Ionicons name="create-outline" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      {/* Messages */}
      {history.isLoading ? (
        <View style={{ flex: 1 }} className="items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : history.isError ? (
        <View style={{ flex: 1 }} className="items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
          <Text className="mt-2 font-psemibold text-[15px] text-ink">
            Couldn&apos;t load this conversation
          </Text>
          <Pressable onPress={() => history.refetch()} className="mt-4 active:opacity-70">
            <Text className="font-psemibold text-[14px] text-brand">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerClassName="p-4"
          keyboardShouldPersistTaps="handled"
          // Content grew — a message was sent or a reply arrived. Animate, so
          // the movement reads as the conversation advancing.
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          // The *viewport* changed size. Opening the keyboard shifts the input
          // row up by its height, which shrinks this ScrollView — but the
          // content is unchanged, so onContentSizeChange never fires and the
          // scroll position stays put. The end of a long reply then sits behind
          // the input with no way to reach it.
          //
          // onLayout is the matching signal: it fires whenever this view is
          // resized, including on keyboard show and hide. Not animated, because
          // this is a resize rather than new content — animating it makes the
          // whole thread appear to lurch when the keyboard opens.
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {items.map((m) => (
            <Bubble
              key={m.id}
              message={m}
              // The greeting and the optimistic pending bubble have no
              // persisted row yet, so there is nothing to delete.
              onLongPress={
                m.id === "greeting" || m.id === "pending"
                  ? undefined
                  : () => confirmDeleteMessage(m.id)
              }
            />
          ))}
          {sendChat.isPending ? <TypingBubble /> : null}
          {failed ? <FailedBanner message={failed.message} onRetry={retry} /> : null}
        </ScrollView>
      )}

      {/* Input */}
      <View
        style={{ marginBottom: keyboardHeight }}
        className="flex-row items-end border-t border-line bg-surface px-3 py-2"
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your trip…"
          placeholderTextColor={colors.faint}
          multiline
          className="max-h-[120px] flex-1 rounded-2xl bg-canvas px-4 py-2.5 font-sans text-[15px] text-ink"
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || sendChat.isPending}
          accessibilityLabel="Send message"
          className={`ml-2 h-11 w-11 items-center justify-center rounded-full bg-brand active:opacity-90 ${
            !input.trim() || sendChat.isPending ? "opacity-50" : ""
          }`}
        >
          <Ionicons name="arrow-up" size={20} color={colors.surface} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
