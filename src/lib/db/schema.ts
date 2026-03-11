import type Database from "better-sqlite3";

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
}
