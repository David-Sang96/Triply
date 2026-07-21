import "dotenv/config";

import { neon } from "@neondatabase/serverless";

// ONE-TIME data fix, needed before migration 0003 can add the
// chat_messages_exactly_one_thread CHECK constraint.
//
// chat_messages was created in migration 0001 with only trip_id (no
// conversation_id — that column was added later in 0002 for the
// multi-conversation feature). So any general-chat message saved before that
// column existed has BOTH trip_id and conversation_id as NULL, which the new
// constraint rejects.
//
// This groups each affected user's orphaned messages (their old single
// general thread) into one new chat_conversations row, oldest-first, and
// points those messages at it — no messages are deleted or reworded.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const MAX_TITLE_LENGTH = 40;
function titleFromMessage(text) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const capped =
    trimmed.length > MAX_TITLE_LENGTH
      ? trimmed.slice(0, MAX_TITLE_LENGTH).replace(/\s+\S*$/, "") + "…"
      : trimmed;
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

const sql = neon(process.env.DATABASE_URL);

const bothSet = await sql`
  SELECT id FROM chat_messages WHERE trip_id IS NOT NULL AND conversation_id IS NOT NULL
`;
if (bothSet.length > 0) {
  console.error(
    `Found ${bothSet.length} message(s) with BOTH trip_id and conversation_id set — ` +
      "not touching those automatically. Inspect them manually first.",
  );
  process.exit(1);
}

const orphanUsers = await sql`
  SELECT DISTINCT user_id FROM chat_messages
  WHERE trip_id IS NULL AND conversation_id IS NULL
`;

console.log(`${orphanUsers.length} user(s) have orphaned general-chat messages.`);

let backfilled = 0;
for (const { user_id } of orphanUsers) {
  const messages = await sql`
    SELECT id, content FROM chat_messages
    WHERE user_id = ${user_id} AND trip_id IS NULL AND conversation_id IS NULL
    ORDER BY created_at ASC
  `;
  const title = titleFromMessage(messages[0].content);

  const [conversation] = await sql`
    INSERT INTO chat_conversations (user_id, title)
    VALUES (${user_id}, ${title})
    RETURNING id
  `;

  const ids = messages.map((m) => m.id);
  await sql`
    UPDATE chat_messages SET conversation_id = ${conversation.id}
    WHERE id = ANY(${ids}::uuid[])
  `;

  backfilled += messages.length;
  console.log(`  user ${user_id}: ${messages.length} message(s) -> conversation ${conversation.id}`);
}

console.log(`✅ Backfilled ${backfilled} message(s) across ${orphanUsers.length} user(s).`);
