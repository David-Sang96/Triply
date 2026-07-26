import * as Sentry from "@sentry/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ChatUsage, SendChatResponse } from "@/shared/chat-contract";

import { ApiError, useApiFetch } from "./api";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  turnId: string;
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

const AGENT_NAME = "Triply Assistant";

// Sentry's message shape: {role, parts:[{type, content}]}, stringified because
// span attributes only hold primitives.
function genAiMessages(role: "user" | "assistant", content: string): string {
  return JSON.stringify([{ role, parts: [{ type: "text", content }] }]);
}

function setUsage(span: Sentry.Span, usage: ChatUsage | undefined) {
  if (!usage) return;
  const attrs: Record<string, number> = {};

  if (usage.inputTokens != null) attrs["gen_ai.usage.input_tokens"] = usage.inputTokens;
  if (usage.cachedInputTokens != null)
    attrs["gen_ai.usage.input_tokens.cached"] = usage.cachedInputTokens;

  // Gemini reports candidate and thought tokens as disjoint counts
  // (prompt + candidates + thoughts === total), but Sentry defines reasoning
  // as a *subset* of output. Passing Gemini's numbers straight through would
  // show reasoning exceeding output and under-report output cost, so they are
  // summed back together here.
  if (usage.outputTokens != null || usage.reasoningTokens != null) {
    attrs["gen_ai.usage.output_tokens"] =
      (usage.outputTokens ?? 0) + (usage.reasoningTokens ?? 0);
  }
  if (usage.reasoningTokens != null)
    attrs["gen_ai.usage.output_tokens.reasoning"] = usage.reasoningTokens;

  if (usage.totalTokens != null) attrs["gen_ai.usage.total_tokens"] = usage.totalTokens;
  for (const [k, v] of Object.entries(attrs)) span.setAttribute(k, v);
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
    // Wrapped in the two spans Sentry's AI Agents dashboard looks for: an
    // invoke_agent span for the turn, and a nested gen_ai.chat span for the
    // model call. Both are timed from the client, so their duration includes
    // the network round-trip — the true model latency is only visible once the
    // Workers runtime has its own Sentry SDK.
    mutationFn: (message: string) =>
      Sentry.startSpan(
        {
          op: "gen_ai.invoke_agent",
          name: `invoke_agent ${AGENT_NAME}`,
          attributes: {
            "gen_ai.operation.name": "invoke_agent",
            "gen_ai.agent.name": AGENT_NAME,
            "gen_ai.pipeline.name": ref.tripId ? "trip-chat" : "assistant-chat",
          },
        },
        (agentSpan) =>
          Sentry.startSpan(
            {
              op: "gen_ai.chat",
              name: "chat gemini",
              attributes: {
                "gen_ai.operation.name": "chat",
                "gen_ai.provider.name": "gcp.gemini",
                "gen_ai.agent.name": AGENT_NAME,
                "gen_ai.input.messages": genAiMessages("user", message),
              },
            },
            async (chatSpan) => {
              const res = await apiFetch<SendChatResponse>("/api/chat", {
                method: "POST",
                json: {
                  message,
                  tripId: ref.tripId ?? null,
                  conversationId: ref.conversationId ?? null,
                },
              });

              if (res.model) {
                for (const span of [agentSpan, chatSpan]) {
                  span.setAttribute("gen_ai.request.model", res.model.requested);
                }
                chatSpan.setAttribute("gen_ai.response.model", res.model.responded);
                chatSpan.setAttribute("gen_ai.request.temperature", res.model.temperature);
                chatSpan.setAttribute(
                  "gen_ai.request.max_tokens",
                  res.model.maxOutputTokens,
                );
              }

              const output = genAiMessages("assistant", res.reply);
              chatSpan.setAttribute("gen_ai.output.messages", output);
              agentSpan.setAttribute("gen_ai.output.messages", output);
              setUsage(chatSpan, res.usage);
              setUsage(agentSpan, res.usage);

              return res;
            },
          ),
      ),
    onSuccess: () => {
      Sentry.logger.info("Chat message sent", {
        has_conversation_id: Boolean(ref.conversationId),
      });
    },
    onError: (error) => {
      // Status is enum-like (an approved telemetry field); the error's
      // message text is user-facing display copy, not logged here.
      Sentry.logger.warn("Chat message failed", {
        has_conversation_id: Boolean(ref.conversationId),
        status: error instanceof ApiError ? error.status : null,
      });
    },
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

// Deletes a whole general-assistant conversation (its messages cascade
// server-side).
export function useDeleteConversation() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/chat/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

// Deletes a whole turn (the question and its reply) given either message's
// id. Works in both general conversations and the trip-scoped thread.
export function useDeleteMessage(ref: ThreadRef) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch<{ ok: true }>(`/api/chat/messages/${messageId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", threadKey(ref)] }),
  });
}
