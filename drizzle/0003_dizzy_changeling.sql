CREATE INDEX IF NOT EXISTS "activities_day_id_idx" ON "activities" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_idx" ON "chat_conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_user_id_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_exactly_one_thread" CHECK (("chat_messages"."trip_id" is not null) <> ("chat_messages"."conversation_id" is not null));