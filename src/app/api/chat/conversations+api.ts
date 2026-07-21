import { desc, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { chatConversations } from "@/server/db/schema";

// GET /api/chat/conversations — the signed-in user's general-assistant
// conversations (the trip-scoped chat is a single thread and isn't listed
// here), most-recently-active first.
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  const rows = await db
    .select({
      id: chatConversations.id,
      title: chatConversations.title,
      updatedAt: chatConversations.updatedAt,
    })
    .from(chatConversations)
    .where(eq(chatConversations.userId, userId))
    .orderBy(desc(chatConversations.updatedAt))
    .limit(100);

  return Response.json({ conversations: rows });
}
