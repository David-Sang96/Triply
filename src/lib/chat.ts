import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApiFetch } from "./api";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
};

// Identifies which thread this screen/hook is talking about: a trip's single
// thread, one general-assistant conversation, or (both null) a not-yet-started
// new general chat.
export type ThreadRef = { tripId?: string | null; conversationId?: string | null };

function threadKey(ref: ThreadRef) {
  return ref.tripId ? `trip:${ref.tripId}` : (ref.conversationId ?? "new");
}

// The user's general-assistant conversations, most recently active first.
export function useConversations() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      apiFetch<{ conversations: Conversation[] }>("/api/chat/conversations").then(
        (r) => r.conversations,
      ),
  });
}

export function useChatHistory(ref: ThreadRef) {
  const apiFetch = useApiFetch();
  const params = new URLSearchParams();
  if (ref.tripId) params.set("tripId", ref.tripId);
  else if (ref.conversationId) params.set("conversationId", ref.conversationId);
  const qs = params.toString();

  return useQuery({
    queryKey: ["chat", threadKey(ref)],
    queryFn: () =>
      apiFetch<{ messages: ChatMessage[] }>(`/api/chat${qs ? `?${qs}` : ""}`).then(
        (r) => r.messages,
      ),
  });
}

// Sends the newest message; the server loads persisted history itself. In
// general mode with no conversationId yet, the server creates one and returns
// its id (the caller should adopt it for subsequent messages/history).
export function useSendChat(ref: ThreadRef) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      apiFetch<{ reply: string; conversationId: string | null }>("/api/chat", {
        method: "POST",
        json: {
          message,
          tripId: ref.tripId ?? null,
          conversationId: ref.conversationId ?? null,
        },
      }),
    onSettled: (data) => {
      qc.invalidateQueries({ queryKey: ["chat", threadKey(ref)] });
      // A brand-new general conversation now has an id: its thread key changes
      // from "new" to the real id, and the conversation list gained an entry.
      if (data?.conversationId && data.conversationId !== ref.conversationId) {
        qc.invalidateQueries({ queryKey: ["chat", data.conversationId] });
      }
      if (!ref.tripId) qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
