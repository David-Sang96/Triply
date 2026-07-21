import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useChatHistory, useSendChat } from "@/lib/chat";
import { colors } from "@/theme/colors";

const NEW_CHAT_GREETING =
  "Hi! I'm your Triply travel assistant. Ask me anything about planning a trip.";

const BOT_ICON = require("@/assets/images/chat-bot.png");

type DisplayMessage = { id: string; role: "user" | "assistant"; content: string };

function Bubble({ message }: { message: DisplayMessage }) {
  if (message.role === "user") {
    return (
      <View className="mb-3 flex-row justify-end">
        <View className="max-w-[82%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5">
          <Text className="font-sans text-[15px] leading-[21px] text-white">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View className="mb-3 flex-row items-end">
      <Image
        source={BOT_ICON}
        style={{ width: 26, height: 26, borderRadius: 13 }}
      />
      <View className="ml-2 max-w-[82%] rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5">
        <Text className="font-sans text-[15px] leading-[21px] text-ink">
          {message.content}
        </Text>
      </View>
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

  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  // Shown immediately on send, before the server confirms it (removed once the
  // persisted thread includes it).
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null);
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
  // Once the persisted thread includes it, drop the optimistic bubble instead
  // of rendering a duplicate (computed at render time — no effect needed).
  const pendingConfirmed =
    pendingUserMsg != null &&
    persisted.some((m) => m.role === "user" && m.content === pendingUserMsg);

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
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {items.map((m) => (
            <Bubble key={m.id} message={m} />
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
