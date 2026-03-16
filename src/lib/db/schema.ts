import type Database from "better-sqlite3";
import { buildCorpusBasePrompt } from "@/lib/corpus-config";

export function ensureSchema(db: Database.Database): void {
  // Prune expired sessions on cold boot
  try {
    db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  } catch {
    // Table may not exist yet on first boot — safe to ignore
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );
  `);

  // Extend users table (idempotent — try/catch for existing columns)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(
      `ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`,
    );
  } catch {
    // Column already exists
  }

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Conversations + Messages tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      parts TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id);
  `);

  // Sprint 0: Add status column to conversations (CONVO-050)
  try {
    db.exec(`ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  } catch {
    // Column already exists
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_conv_user_status ON conversations(user_id, status)`);

  // Sprint 0: Metadata columns on conversations (CONVO-070)
  try { db.exec(`ALTER TABLE conversations ADD COLUMN converted_from TEXT DEFAULT NULL`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE conversations ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE conversations ADD COLUMN first_message_at TEXT DEFAULT NULL`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE conversations ADD COLUMN last_tool_used TEXT DEFAULT NULL`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE conversations ADD COLUMN session_source TEXT NOT NULL DEFAULT 'unknown'`); } catch { /* exists */ }
  try { db.exec(`ALTER TABLE conversations ADD COLUMN prompt_version INTEGER DEFAULT NULL`); } catch { /* exists */ }

  // Sprint 0: token_estimate on messages (CONVO-070)
  try {
    db.exec(`ALTER TABLE messages ADD COLUMN token_estimate INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Sprint 0: Conversation events table (CONVO-070)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_events (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_conv_events_conv ON conversation_events(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conv_events_type ON conversation_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_conv_events_created ON conversation_events(created_at);
  `);

  // Embeddings table for vector search (§5.2)
  db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_level TEXT NOT NULL,
      heading TEXT,
      content TEXT NOT NULL,
      embedding_input TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      model_version TEXT NOT NULL,
      embedding BLOB NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_emb_source_type ON embeddings(source_type);
    CREATE INDEX IF NOT EXISTS idx_emb_source_id ON embeddings(source_id);
    CREATE INDEX IF NOT EXISTS idx_emb_level ON embeddings(chunk_level);
    CREATE INDEX IF NOT EXISTS idx_emb_hash ON embeddings(source_id, content_hash);
    CREATE INDEX IF NOT EXISTS idx_emb_model ON embeddings(model_version);

    CREATE TABLE IF NOT EXISTS bm25_stats (
      source_type TEXT PRIMARY KEY,
      stats_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // User files table — caches generated assets (audio, charts, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversation_id TEXT,
      content_hash TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_uf_user ON user_files(user_id);
    CREATE INDEX IF NOT EXISTS idx_uf_hash ON user_files(user_id, content_hash, file_type);
    CREATE INDEX IF NOT EXISTS idx_uf_conv ON user_files(conversation_id);
  `);

  // Seed roles
  const seedRoles = db.prepare(`
    INSERT OR IGNORE INTO roles (id, name, description)
    VALUES 
      ('role_anonymous', 'ANONYMOUS', 'No access'),
      ('role_authenticated', 'AUTHENTICATED', 'Logged in user with basic privileges'),
      ('role_staff', 'STAFF', 'Internal team member'),
      ('role_admin', 'ADMIN', 'Full system access')
  `);
  seedRoles.run();

  // Seed mock users
  const seedUsers = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name)
    VALUES 
      ('usr_anonymous', 'anonymous@example.com', 'Anonymous User'),
      ('usr_authenticated', 'authenticated@example.com', 'Standard User'),
      ('usr_staff', 'staff@example.com', 'Staff Member'),
      ('usr_admin', 'admin@example.com', 'System Admin')
  `);
  seedUsers.run();

  // Bind users to roles
  const seedUserRoles = db.prepare(`
    INSERT OR IGNORE INTO user_roles (user_id, role_id)
    VALUES
      ('usr_anonymous', 'role_anonymous'),
      ('usr_authenticated', 'role_authenticated'),
      ('usr_staff', 'role_staff'),
      ('usr_admin', 'role_admin')
  `);
  seedUserRoles.run();

  // Sprint 3: System prompts table (CONVO-060)
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_prompts (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      prompt_type TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT DEFAULT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_active
      ON system_prompts(role, prompt_type) WHERE is_active = 1;
  `);

  // Sprint 3: Seed hardcoded prompts as version 1 (idempotent)
  seedSystemPrompts(db);
}

function seedSystemPrompts(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO system_prompts (id, role, prompt_type, content, version, is_active, notes)
    VALUES (?, ?, ?, ?, 1, 1, 'Initial hardcoded seed')
  `);

  const seeds: Array<{ id: string; role: string; promptType: string; content: string }> =
    SYSTEM_PROMPT_SEEDS;

  const tx = db.transaction(() => {
    for (const s of seeds) {
      insert.run(s.id, s.role, s.promptType, s.content);
    }
  });
  tx();
}

/**
 * Hardcoded prompt seeds — exported so the DefaultingSystemPromptRepository
 * can use them as fallbacks and tests can reference canonical content.
 */
export const SYSTEM_PROMPT_SEEDS: Array<{
  id: string;
  role: string;
  promptType: string;
  content: string;
}> = [
  {
    id: "seed_base_all",
    role: "ALL",
    promptType: "base",
    content: buildCorpusBasePrompt(),
  },
  {
    id: "seed_directive_anonymous",
    role: "ANONYMOUS",
    promptType: "role_directive",
    content: [
      "",
      "ROLE CONTEXT — DEMO MODE:",
      "The user is browsing without an account. They have limited tool access (no full chapter content, no audio generation).",
      "Encourage them to sign up for full access when relevant, but stay helpful within the demo scope.",
    ].join("\n"),
  },
  {
    id: "seed_directive_authenticated",
    role: "AUTHENTICATED",
    promptType: "role_directive",
    content: [
      "",
      "ROLE CONTEXT — REGISTERED USER:",
      "The user is a registered member with full access to all tools and content.",
      "You have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
    ].join("\n"),
  },
  {
    id: "seed_directive_staff",
    role: "STAFF",
    promptType: "role_directive",
    content: [
      "",
      "ROLE CONTEXT — STAFF MEMBER:",
      "The user is a staff member. Full tool access with an analytics and operational framing.",
      "You have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
    ].join("\n"),
  },
  {
    id: "seed_directive_admin",
    role: "ADMIN",
    promptType: "role_directive",
    content: [
      "",
      "ROLE CONTEXT — SYSTEM ADMINISTRATOR:",
      "The user is a system administrator with full control over all tools, content, and configuration.",
      "",
      "ADMIN-ONLY CAPABILITIES (Corpus Management — via MCP Librarian tools):",
      "- **corpus_list**: List all documents in the corpus with metadata.",
      "- **corpus_get**: Get a specific document's details and sections.",
      "- **corpus_add_document**: Add a new document (manual fields or zip archive upload).",
      "- **corpus_add_section**: Add a section to an existing document.",
      "- **corpus_remove_document**: Remove a document and all its sections.",
      "- **corpus_remove_section**: Remove a single section from a document.",
      "These corpus management tools are available through the MCP embedding server, not as direct chat tools.",
      "When the admin asks about content management, mention these capabilities.",
      "",
      "ADMIN-ONLY TOOL — Web Search:",
      "- **admin_web_search**: Search the live web and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g., allowed_domains=['en.wikipedia.org'] for Wikipedia research). You MUST call this tool directly when the admin asks you to search the web.",
      "",
      "You also have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
    ].join("\n"),
  },
];
