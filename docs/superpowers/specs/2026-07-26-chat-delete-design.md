# Chat delete — conversations and messages

## Goal

There is currently no way to delete anything in chat: a general-assistant
conversation stays in the "Chats" inbox forever, and a single message can't be
removed from a thread. Add both:

1. Delete a whole conversation from the Chats inbox.
2. Delete a single message from any thread (general or trip-scoped) — removing
   the whole turn (the question and its reply together), not just one bubble.

## Data model change

`chat_messages` (`src/server/db/schema.ts`) gets one new column:

```ts
turnId: uuid("turn_id").defaultRandom().notNull(),
```

Every `POST /api/chat` call generates one `turnId` (`crypto.randomUUID()`) and
stamps it on both rows it inserts (the user message and the assistant reply).
That's what makes "delete this turn" exact: deleting by `turn_id` is correct
even when a reply failed and left an unanswered question behind (position-based
pairing — "delete the next/previous row" — would risk grabbing the wrong
neighbor in that case).

Existing rows predate this column, so the migration backfills each one with
its own distinct random value (Postgres computes a fresh default per row for a
`NOT NULL DEFAULT` backfill). An old message is therefore its own single-row
"turn" — deleting it just deletes itself, never a neighbor. Safe fallback, no
data loss.

**Migration is developer-run**, per this repo's rules: edit `schema.ts` →
`npm run db:generate` → `npm run db:migrate`. Not run as part of this change.

## Server changes

### `src/app/api/chat+api.ts`

- `POST` — generate `const turnId = crypto.randomUUID()` once per request;
  pass `turnId` to both the user-message insert and the assistant-message
  insert.
- `GET` — add `turnId: chatMessages.turnId` to the message projection.

### `src/app/api/chat/conversations+api.ts` → new `[id]+api.ts`

New `DELETE /api/chat/conversations/:id`, mirroring the existing
`DELETE /api/trips/:id` pattern (`src/app/api/trips/[id]+api.ts`):
validate the id, delete the `chat_conversations` row scoped to
`(id, userId)`, return 404 if nothing matched. Its messages cascade-delete via
the existing FK (`chatMessages.conversationId` → `onDelete: "cascade"`); no
extra cleanup needed (unlike trip delete, there's no external asset like a
cover image to remove).

### New `src/app/api/chat/messages/[id]+api.ts`

`DELETE /api/chat/messages/:id`:
1. Look up the message row by `(id, userId)`; 404 if not found/not owned.
2. Read its `turnId`.
3. Delete every `chat_messages` row where `(turn_id = that value AND
   user_id = userId)`.
4. Return `{ ok: true }`.

Works the same regardless of which bubble (question or reply) was tapped,
since both rows in a turn share the same `turn_id`.

## Client library changes (`src/lib/chat.ts`)

- `ChatMessage` type gains `turnId: string`.
- New `useDeleteConversation()` — `useMutation` calling
  `DELETE /api/chat/conversations/:id`; on success, invalidates
  `["conversations"]`.
- New `useDeleteMessage(ref: ThreadRef)` — `useMutation` taking a message id,
  calling `DELETE /api/chat/messages/:id`; on success, invalidates
  `["chat", threadKey(ref)]` so the thread refetches without the deleted turn.

## UI changes

### `src/app/chats.tsx` — delete a conversation

`ConversationRow` gets two entry points to the same confirmation, both ending
in the existing `Alert.alert` destructive-confirm pattern already used for
trip delete (`TripDetailView.tsx`'s `confirmDelete`):

- **Swipe left** reveals a red "Delete" action (`Swipeable` from
  `react-native-gesture-handler`, `renderRightActions`).
- **Long-press** the row triggers the same confirm dialog directly.

Tapping "Delete" in the dialog calls `useDeleteConversation()`.

This is the app's first direct use of an interactive gesture-handler
component (the dependency is already installed, but unused directly so far).
`src/app/_layout.tsx` needs `GestureHandlerRootView` wrapping the root —
without it, `Swipeable`'s pan gesture can silently fail to respond,
particularly on Android.

### `src/app/chat.tsx` — delete a message

`Bubble` gets `onLongPress` → the same `Alert.alert` pattern:
`"Delete this message?"` / `"This removes both your question and the
reply."` → Cancel / Delete (destructive). Confirming calls
`useDeleteMessage(threadRef).mutate(message.id)`.

Only persisted messages are long-press-able — the synthetic `"greeting"` bubble
(no real row) and the `"pending"` optimistic bubble (not yet confirmed
persisted) are excluded, since neither has a real id/turn to delete.

Applies to both general conversations and the trip-scoped thread — `Bubble`
doesn't need to know which kind of thread it's in.

## Out of scope

- Bulk/multi-select delete.
- Undo after delete (destructive confirm dialog is the only safety net, same
  as trip delete today).
- Editing a message (only delete).
