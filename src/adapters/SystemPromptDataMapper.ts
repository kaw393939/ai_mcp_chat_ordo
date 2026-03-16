import type Database from "better-sqlite3";
import crypto from "crypto";
import type {
  SystemPrompt,
  SystemPromptRepository,
} from "@/core/use-cases/SystemPromptRepository";

interface PromptRow {
  id: string;
  role: string;
  prompt_type: string;
  content: string;
  version: number;
  is_active: number;
  created_at: string;
  created_by: string | null;
  notes: string;
}

function toModel(row: PromptRow): SystemPrompt {
  return {
    id: row.id,
    role: row.role,
    promptType: row.prompt_type as "base" | "role_directive",
    content: row.content,
    version: row.version,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    createdBy: row.created_by,
    notes: row.notes,
  };
}

export class SystemPromptDataMapper implements SystemPromptRepository {
  constructor(private readonly db: Database.Database) {}

  async getActive(role: string, promptType: string): Promise<SystemPrompt | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM system_prompts WHERE role = ? AND prompt_type = ? AND is_active = 1`,
      )
      .get(role, promptType) as PromptRow | undefined;
    return row ? toModel(row) : null;
  }

  async listVersions(role: string, promptType: string): Promise<SystemPrompt[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM system_prompts WHERE role = ? AND prompt_type = ? ORDER BY version DESC`,
      )
      .all(role, promptType) as PromptRow[];
    return rows.map(toModel);
  }

  async getByVersion(
    role: string,
    promptType: string,
    version: number,
  ): Promise<SystemPrompt | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM system_prompts WHERE role = ? AND prompt_type = ? AND version = ?`,
      )
      .get(role, promptType, version) as PromptRow | undefined;
    return row ? toModel(row) : null;
  }

  async createVersion(params: {
    role: string;
    promptType: string;
    content: string;
    createdBy: string;
    notes: string;
  }): Promise<SystemPrompt> {
    const maxRow = this.db
      .prepare(
        `SELECT MAX(version) as max_v FROM system_prompts WHERE role = ? AND prompt_type = ?`,
      )
      .get(params.role, params.promptType) as { max_v: number | null };

    const nextVersion = (maxRow.max_v ?? 0) + 1;
    const id = `sp_${crypto.randomUUID()}`;

    this.db
      .prepare(
        `INSERT INTO system_prompts (id, role, prompt_type, content, version, is_active, created_by, notes)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(id, params.role, params.promptType, params.content, nextVersion, params.createdBy, params.notes);

    const created = await this.getByVersion(params.role, params.promptType, nextVersion);
    if (!created) {
      throw new Error("Failed to load the newly created system prompt version.");
    }

    return created;
  }

  async activate(role: string, promptType: string, version: number): Promise<void> {
    this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE system_prompts SET is_active = 0 WHERE role = ? AND prompt_type = ? AND is_active = 1`,
        )
        .run(role, promptType);
      this.db
        .prepare(
          `UPDATE system_prompts SET is_active = 1 WHERE role = ? AND prompt_type = ? AND version = ?`,
        )
        .run(role, promptType, version);
    })();
  }
}
