// The POST /api/chat response contract, shared by the route that produces it
// (src/app/api/chat+api.ts) and the hook that consumes it (src/lib/chat.ts) so
// the two can't drift apart unnoticed.
//
// Types only. `import type` is erased at compile time, so this pulls nothing
// into the app bundle — the reason src/lib/trips.ts mirrors its shapes by hand
// is to keep Drizzle and other server code out, which doesn't apply here.

/** Which model was asked for, which one answered, and how it was configured. */
export type ChatModelInfo = {
  requested: string;
  responded: string;
  temperature: number;
  maxOutputTokens: number;
};

/**
 * Raw Gemini token counts. Note these are *disjoint*: prompt + candidates +
 * thoughts === total. Sentry instead treats reasoning as a subset of output,
 * so setUsage() in src/lib/chat.ts recombines them before reporting.
 */
export type ChatUsage = {
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
};

/**
 * What a client should expect to read. `model` and `usage` are optional on
 * purpose: the app ships through the stores while the API deploys separately,
 * so a released build can be talking to an older — or rolled back — route that
 * predates these fields. Callers must keep handling their absence.
 */
export type SendChatResponse = {
  reply: string;
  conversationId: string | null;
  model?: ChatModelInfo;
  usage?: ChatUsage;
};

/**
 * What the route must return on success. Required here so dropping a field
 * server-side is a compile error, without promising the client something a
 * mismatched deployment can't deliver.
 */
export type SendChatSuccess = SendChatResponse & {
  model: ChatModelInfo;
  usage: ChatUsage;
};
