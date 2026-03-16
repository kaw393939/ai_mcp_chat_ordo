import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "../lib/db/schema";
import { UserFileDataMapper } from "./UserFileDataMapper";

function requireValue<T>(value: T | null | undefined): T {
  expect(value).toBeTruthy();
  if (value == null) {
    throw new Error("Expected value to be present.");
  }
  return value;
}

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function seedUser(db: Database.Database, id = "usr_test") {
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, 'Test')`,
  ).run(id, `${id}@test.com`);
  db.prepare(
    `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, 'role_authenticated')`,
  ).run(id);
}

function seedConversation(db: Database.Database, id = "conv_1", userId = "usr_test") {
  db.prepare(
    `INSERT OR IGNORE INTO conversations (id, user_id, title) VALUES (?, ?, 'Test Conv')`,
  ).run(id, userId);
}

describe("UserFileDataMapper", () => {
  let db: Database.Database;
  let mapper: UserFileDataMapper;

  beforeEach(() => {
    db = createDb();
    seedUser(db);
    seedConversation(db);
    mapper = new UserFileDataMapper(db);
  });

  it("create → findById lifecycle", async () => {
    const file = await mapper.create({
      id: "uf_001",
      userId: "usr_test",
      conversationId: "conv_1",
      contentHash: "abc123def456",
      fileType: "audio",
      fileName: "abc123def456.mp3",
      mimeType: "audio/mpeg",
      fileSize: 1024,
    });

    expect(file.id).toBe("uf_001");
    expect(file.userId).toBe("usr_test");
    expect(file.conversationId).toBe("conv_1");
    expect(file.contentHash).toBe("abc123def456");
    expect(file.fileType).toBe("audio");
    expect(file.fileName).toBe("abc123def456.mp3");
    expect(file.mimeType).toBe("audio/mpeg");
    expect(file.fileSize).toBe(1024);
    expect(file.createdAt).toBeTruthy();

    const found = requireValue(await mapper.findById("uf_001"));
    expect(found.id).toBe("uf_001");
    expect(found.contentHash).toBe("abc123def456");
  });

  it("findById returns null for nonexistent id", async () => {
    const found = await mapper.findById("uf_nonexistent");
    expect(found).toBeNull();
  });

  it("findByHash returns matching file", async () => {
    await mapper.create({
      id: "uf_hash1",
      userId: "usr_test",
      conversationId: null,
      contentHash: "hashABC",
      fileType: "audio",
      fileName: "hashABC.mp3",
      mimeType: "audio/mpeg",
      fileSize: 512,
    });

    const found = requireValue(await mapper.findByHash("usr_test", "hashABC", "audio"));
    expect(found.id).toBe("uf_hash1");
  });

  it("findByHash distinguishes by fileType", async () => {
    await mapper.create({
      id: "uf_audio",
      userId: "usr_test",
      conversationId: null,
      contentHash: "sameHash",
      fileType: "audio",
      fileName: "sameHash.mp3",
      mimeType: "audio/mpeg",
      fileSize: 100,
    });

    const audioMatch = await mapper.findByHash("usr_test", "sameHash", "audio");
    expect(audioMatch).not.toBeNull();

    const chartMatch = await mapper.findByHash("usr_test", "sameHash", "chart");
    expect(chartMatch).toBeNull();
  });

  it("findByHash distinguishes by userId", async () => {
    seedUser(db, "usr_other");
    await mapper.create({
      id: "uf_user1",
      userId: "usr_test",
      conversationId: null,
      contentHash: "sharedHash",
      fileType: "audio",
      fileName: "sharedHash.mp3",
      mimeType: "audio/mpeg",
      fileSize: 100,
    });

    const ownerMatch = await mapper.findByHash("usr_test", "sharedHash", "audio");
    expect(ownerMatch).not.toBeNull();

    const otherMatch = await mapper.findByHash("usr_other", "sharedHash", "audio");
    expect(otherMatch).toBeNull();
  });

  it("listByConversation returns files ordered by created_at ASC", async () => {
    await mapper.create({
      id: "uf_c1",
      userId: "usr_test",
      conversationId: "conv_1",
      contentHash: "h1",
      fileType: "audio",
      fileName: "h1.mp3",
      mimeType: "audio/mpeg",
      fileSize: 100,
    });
    await mapper.create({
      id: "uf_c2",
      userId: "usr_test",
      conversationId: "conv_1",
      contentHash: "h2",
      fileType: "chart",
      fileName: "h2.svg",
      mimeType: "image/svg+xml",
      fileSize: 200,
    });

    const files = await mapper.listByConversation("conv_1");
    expect(files.length).toBe(2);
    expect(files[0].id).toBe("uf_c1");
    expect(files[1].id).toBe("uf_c2");
  });

  it("listByUser returns files ordered by created_at DESC", async () => {
    await mapper.create({
      id: "uf_u1",
      userId: "usr_test",
      conversationId: null,
      contentHash: "h1",
      fileType: "audio",
      fileName: "h1.mp3",
      mimeType: "audio/mpeg",
      fileSize: 100,
    });
    // Force second file to have a later timestamp
    db.prepare(`UPDATE user_files SET created_at = '2099-01-01' WHERE id = 'uf_u1'`).run();
    await mapper.create({
      id: "uf_u2",
      userId: "usr_test",
      conversationId: null,
      contentHash: "h2",
      fileType: "audio",
      fileName: "h2.mp3",
      mimeType: "audio/mpeg",
      fileSize: 200,
    });

    const files = await mapper.listByUser("usr_test");
    expect(files.length).toBe(2);
    // DESC order: uf_u1 (2099) first, then uf_u2
    expect(files[0].id).toBe("uf_u1");
    expect(files[1].id).toBe("uf_u2");
  });

  it("delete removes the record", async () => {
    await mapper.create({
      id: "uf_del",
      userId: "usr_test",
      conversationId: null,
      contentHash: "hDel",
      fileType: "audio",
      fileName: "hDel.mp3",
      mimeType: "audio/mpeg",
      fileSize: 50,
    });

    const before = await mapper.findById("uf_del");
    expect(before).not.toBeNull();

    await mapper.delete("uf_del");

    const after = await mapper.findById("uf_del");
    expect(after).toBeNull();
  });

  it("supports null conversationId", async () => {
    const file = await mapper.create({
      id: "uf_null_conv",
      userId: "usr_test",
      conversationId: null,
      contentHash: "hNull",
      fileType: "document",
      fileName: "hNull.pdf",
      mimeType: "application/pdf",
      fileSize: 999,
    });

    expect(file.conversationId).toBeNull();
    expect(file.fileType).toBe("document");
  });
});
