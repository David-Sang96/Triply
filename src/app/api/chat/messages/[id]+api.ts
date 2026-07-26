import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { chatMessages } from "@/server/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

// DELETE /api/chat/messages/:id — removes the whole turn :id belongs to (the
// question and its reply together), not just the one row tapped. Works the
// same whether :id names the user message or the assistant reply, since both
// rows in a turn share the same turnId (stamped once per POST /api/chat call).
export async function DELETE(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const [message] = await db
    .select({ turnId: chatMessages.turnId })
    .from(chatMessages)
    .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)))
    .limit(1);

  if (!message) return notFound();

  await db
    .delete(chatMessages)
    .where(
      and(eq(chatMessages.turnId, message.turnId), eq(chatMessages.userId, userId)),
    );

  return Response.json({ ok: true });
}
