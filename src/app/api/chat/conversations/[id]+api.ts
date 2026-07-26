import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { chatConversations } from "@/server/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

// DELETE /api/chat/conversations/:id — remove a general-assistant
// conversation (owner only). Its messages cascade via chatMessages.conversationId's
// onDelete: "cascade", so no extra cleanup is needed here.
export async function DELETE(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const [deleted] = await db
    .delete(chatConversations)
    .where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)))
    .returning({ id: chatConversations.id });

  if (!deleted) return notFound();
  return Response.json({ ok: true });
}
