ALTER TABLE "chat_messages" ADD COLUMN "turn_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "chat_messages_turn_idx" ON "chat_messages" USING btree ("turn_id");