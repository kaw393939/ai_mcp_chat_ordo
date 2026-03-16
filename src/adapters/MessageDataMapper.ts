import type Database from "better-sqlite3";
import type { Message, NewMessage } from "@/core/entities/conversation";
import type { MessageRepository } from "@/core/use-cases/MessageRepository";
import type { MessagePart } from "@/core/entities/message-parts";

export class MessageDataMapper implements MessageRepository {
  constructor(private db: Database.Database) {}

  async create(msg: NewMessage & { tokenEstimate?: number }): Promise<Message> {
    const id = `msg_${crypto.randomUUID()}`;
    const partsJson = JSON.stringify(msg.parts);
    const tokenEstimate = msg.tokenEstimate ?? Math.ceil(msg.content.length / 4);

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, parts, token_estimate)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, msg.conversationId, msg.role, msg.content, partsJson, tokenEstimate);

    const row = this.db
      .prepare(`SELECT id, conversation_id, role, content, parts, created_at, token_estimate FROM messages WHERE id = ?`)
      .get(id) as MessageRow;

    return mapRow(row);
  }

  async listByConversation(conversationId: string): Promise<Message[]> {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, parts, created_at, token_estimate
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
      )
      .all(conversationId) as MessageRow[];

    return rows.map(mapRow);
  }

  async countByConversation(conversationId: string): Promise<number> {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?`)
      .get(conversationId) as { count: number };

    return row.count;
  }
}

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  parts: string;
  created_at: string;
  token_estimate: number;
};

function mapRow(row: MessageRow): Message {
  let parts: MessagePart[];
  try {
    parts = JSON.parse(row.parts) as MessagePart[];
  } catch {
    parts = [];
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant" | "system",
    content: row.content,
    parts,
    createdAt: row.created_at,
    tokenEstimate: row.token_estimate ?? 0,
  };
}
