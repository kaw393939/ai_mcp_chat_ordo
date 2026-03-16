import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "../lib/db/schema";
import { ConversationEventDataMapper } from "./ConversationEventDataMapper";
import { ConversationDataMapper } from "./ConversationDataMapper";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedUser(db: Database.Database) {
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, name) VALUES ('usr_test', 'test@test.com', 'Test')`,
  ).run();
  db.prepare(
    `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('usr_test', 'role_authenticated')`,
  ).run();
}

describe("ConversationEventDataMapper", () => {
  let db: Database.Database;
  let mapper: ConversationEventDataMapper;

  beforeEach(() => {
    db = createDb();
    seedUser(db);
    // Create a conversation for events to reference
    const convMapper = new ConversationDataMapper(db);
    convMapper.create({ id: "conv_evt", userId: "usr_test", title: "Test" });
    mapper = new ConversationEventDataMapper(db);
  });

  it("records an event and persists it", async () => {
    await mapper.record({
      conversationId: "conv_evt",
      eventType: "started",
      metadata: { session_source: "authenticated" },
    });

    const rows = db
      .prepare(`SELECT * FROM conversation_events WHERE conversation_id = ?`)
      .all("conv_evt") as Array<{ id: string; event_type: string; metadata: string }>;

    expect(rows.length).toBe(1);
    expect(rows[0].event_type).toBe("started");
    expect(JSON.parse(rows[0].metadata)).toEqual({ session_source: "authenticated" });
  });

  it("stores metadata as JSON string", async () => {
    await mapper.record({
      conversationId: "conv_evt",
      eventType: "tool_used",
      metadata: { tool_name: "calculator", role: "AUTHENTICATED" },
    });

    const row = db
      .prepare(`SELECT metadata FROM conversation_events WHERE event_type = 'tool_used'`)
      .get() as { metadata: string };

    const parsed = JSON.parse(row.metadata);
    expect(parsed.tool_name).toBe("calculator");
    expect(parsed.role).toBe("AUTHENTICATED");
  });

  it("records multiple events for the same conversation", async () => {
    await mapper.record({ conversationId: "conv_evt", eventType: "started", metadata: {} });
    await mapper.record({ conversationId: "conv_evt", eventType: "message_sent", metadata: { role: "user" } });
    await mapper.record({ conversationId: "conv_evt", eventType: "tool_used", metadata: { tool_name: "search" } });

    const count = db
      .prepare(`SELECT COUNT(*) AS count FROM conversation_events WHERE conversation_id = ?`)
      .get("conv_evt") as { count: number };

    expect(count.count).toBe(3);
  });
});
