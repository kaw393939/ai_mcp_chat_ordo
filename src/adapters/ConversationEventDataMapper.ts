import type Database from "better-sqlite3";
import type { ConversationEventRepository } from "@/core/use-cases/ConversationEventRecorder";

export class ConversationEventDataMapper implements ConversationEventRepository {
  constructor(private db: Database.Database) {}

  async record(event: {
    conversationId: string;
    eventType: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const id = crypto.randomUUID().replace(/-/g, "");
    this.db
      .prepare(
        `INSERT INTO conversation_events (id, conversation_id, event_type, metadata)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, event.conversationId, event.eventType, JSON.stringify(event.metadata));
  }
}
