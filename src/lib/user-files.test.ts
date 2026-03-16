import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "fs";

// Create a temp dir and override process.cwd BEFORE user-files.ts loads,
// so USER_FILES_ROOT resolves inside the temp directory.
const tmpBase = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const _fs = require("fs") as typeof fs;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const _path = require("path") as { join: (...parts: string[]) => string };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const _os = require("os") as { tmpdir: () => string };
  const dir = _fs.mkdtempSync(_path.join(_os.tmpdir(), "ufs-test-"));
  const origCwd = process.cwd;
  process.cwd = () => dir;
  return { dir, origCwd };
});

import Database from "better-sqlite3";
import { ensureSchema } from "./db/schema";
import { UserFileDataMapper } from "../adapters/UserFileDataMapper";
import { UserFileSystem, contentHash, getUserFilePath } from "./user-files";

afterAll(() => {
  process.cwd = tmpBase.origCwd;
  fs.rmSync(tmpBase.dir, { recursive: true, force: true });
});

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

describe("contentHash", () => {
  it("returns a 32-char hex string", () => {
    const hash = contentHash("Hello world");
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic", () => {
    expect(contentHash("test input")).toBe(contentHash("test input"));
  });

  it("produces different hashes for different inputs", () => {
    expect(contentHash("input A")).not.toBe(contentHash("input B"));
  });
});

describe("UserFileSystem", () => {
  let db: Database.Database;
  let ufs: UserFileSystem;

  beforeEach(() => {
    db = createDb();
    seedUser(db);
    const repo = new UserFileDataMapper(db);
    ufs = new UserFileSystem(repo);
  });

  it("store() writes file to disk and creates DB record", async () => {
    const data = Buffer.from("fake mp3 data");
    const file = await ufs.store({
      userId: "usr_test",
      conversationId: null,
      input: "Hello world",
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data,
    });

    expect(file.id).toMatch(/^uf_/);
    expect(file.userId).toBe("usr_test");
    expect(file.fileType).toBe("audio");
    expect(file.mimeType).toBe("audio/mpeg");
    expect(file.fileSize).toBe(data.length);
    expect(file.contentHash).toBe(contentHash("Hello world"));
    expect(file.fileName).toBe(`${contentHash("Hello world")}.mp3`);

    // Verify file exists on disk
    const diskPath = getUserFilePath("usr_test", file.fileName);
    expect(fs.existsSync(diskPath)).toBe(true);
    expect(fs.readFileSync(diskPath).toString()).toBe("fake mp3 data");
  });

  it("lookup() returns cached file when it exists", async () => {
    const data = Buffer.from("cached audio");
    await ufs.store({
      userId: "usr_test",
      conversationId: null,
      input: "Lookup test",
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data,
    });

    const result = await ufs.lookup("usr_test", "Lookup test", "audio");
    expect(result).not.toBeNull();
    expect(result?.file.contentHash).toBe(contentHash("Lookup test"));
    expect(fs.existsSync(result?.diskPath ?? "")).toBe(true);
  });

  it("lookup() returns null for cache miss", async () => {
    const result = await ufs.lookup("usr_test", "No such content", "audio");
    expect(result).toBeNull();
  });

  it("lookup() cleans up DB record if file was deleted from disk", async () => {
    const data = Buffer.from("will be deleted");
    const file = await ufs.store({
      userId: "usr_test",
      conversationId: null,
      input: "Orphan test",
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data,
    });

    // Delete the file from disk
    const diskPath = getUserFilePath("usr_test", file.fileName);
    fs.unlinkSync(diskPath);

    // lookup should return null and clean up DB
    const result = await ufs.lookup("usr_test", "Orphan test", "audio");
    expect(result).toBeNull();

    // DB record should be gone
    const dbCheck = db
      .prepare(`SELECT * FROM user_files WHERE id = ?`)
      .get(file.id);
    expect(dbCheck).toBeUndefined();
  });

  it("getById() returns file when it exists", async () => {
    const data = Buffer.from("getById test");
    const stored = await ufs.store({
      userId: "usr_test",
      conversationId: null,
      input: "GetById",
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data,
    });

    const result = await ufs.getById(stored.id);
    expect(result).not.toBeNull();
    expect(result?.file.id).toBe(stored.id);
  });

  it("getById() returns null for unknown id", async () => {
    const result = await ufs.getById("uf_nonexistent");
    expect(result).toBeNull();
  });

  it("getById() cleans up orphaned DB record", async () => {
    const data = Buffer.from("orphan getById");
    const stored = await ufs.store({
      userId: "usr_test",
      conversationId: null,
      input: "Orphan GetById",
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data,
    });

    // Delete disk file
    const diskPath = getUserFilePath("usr_test", stored.fileName);
    fs.unlinkSync(diskPath);

    const result = await ufs.getById(stored.id);
    expect(result).toBeNull();
  });

  it("same content produces same hash (dedup key)", async () => {
    const data1 = Buffer.from("audio bytes v1");
    const file1 = await ufs.store({
      userId: "usr_test",
      conversationId: null,
      input: "Same text",
      fileType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
      data: data1,
    });

    // Lookup should hit the first stored file
    const cached = await ufs.lookup("usr_test", "Same text", "audio");
    expect(cached).not.toBeNull();
    expect(cached?.file.id).toBe(file1.id);
  });
});
