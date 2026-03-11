import type Database from "better-sqlite3";
import type {
  EmbeddingRecord,
  VectorQuery,
  VectorStore,
} from "@/core/search/ports/VectorStore";
import type { ChunkMetadata } from "@/core/search/ports/Chunker";

type EmbeddingRow = {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  chunk_level: string;
  heading: string | null;
  content: string;
  embedding_input: string;
  content_hash: string;
  model_version: string;
  embedding: Buffer;
  metadata: string;
};

function serializeEmbedding(embedding: Float32Array): Buffer {
  return Buffer.from(
    embedding.buffer,
    embedding.byteOffset,
    embedding.byteLength,
  );
}

function deserializeEmbedding(buffer: Buffer): Float32Array {
  const copy = Buffer.alloc(buffer.length);
  buffer.copy(copy);
  return new Float32Array(
    copy.buffer,
    copy.byteOffset,
    copy.byteLength / 4,
  );
}

function mapRow(row: EmbeddingRow): EmbeddingRecord {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    chunkIndex: row.chunk_index,
    chunkLevel: row.chunk_level as EmbeddingRecord["chunkLevel"],
    heading: row.heading,
    content: row.content,
    embeddingInput: row.embedding_input,
    contentHash: row.content_hash,
    modelVersion: row.model_version,
    embedding: deserializeEmbedding(row.embedding),
    metadata: JSON.parse(row.metadata) as ChunkMetadata,
  };
}

export class SQLiteVectorStore implements VectorStore {
  constructor(private db: Database.Database) {}

  upsert(records: EmbeddingRecord[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO embeddings
        (id, source_type, source_id, chunk_index, chunk_level, heading,
         content, embedding_input, content_hash, model_version, embedding, metadata,
         updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const tx = this.db.transaction((recs: EmbeddingRecord[]) => {
      for (const r of recs) {
        stmt.run(
          r.id,
          r.sourceType,
          r.sourceId,
          r.chunkIndex,
          r.chunkLevel,
          r.heading,
          r.content,
          r.embeddingInput,
          r.contentHash,
          r.modelVersion,
          serializeEmbedding(r.embedding),
          JSON.stringify(r.metadata),
        );
      }
    });

    tx(records);
  }

  delete(sourceId: string): void {
    this.db.prepare(`DELETE FROM embeddings WHERE source_id = ?`).run(sourceId);
  }

  getAll(query?: VectorQuery): EmbeddingRecord[] {
    let sql = "SELECT * FROM embeddings";
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query?.sourceType) {
      conditions.push("source_type = ?");
      params.push(query.sourceType);
    }
    if (query?.chunkLevel) {
      conditions.push("chunk_level = ?");
      params.push(query.chunkLevel);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (query?.limit) {
      sql += " LIMIT ?";
      params.push(query.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as EmbeddingRow[];
    return rows.map(mapRow);
  }

  getBySourceId(sourceId: string): EmbeddingRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM embeddings WHERE source_id = ? ORDER BY chunk_index`)
      .all(sourceId) as EmbeddingRow[];
    return rows.map(mapRow);
  }

  getContentHash(sourceId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT DISTINCT content_hash FROM embeddings WHERE source_id = ? LIMIT 1`,
      )
      .get(sourceId) as { content_hash: string } | undefined;
    return row?.content_hash ?? null;
  }

  getModelVersion(sourceId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT DISTINCT model_version FROM embeddings WHERE source_id = ? LIMIT 1`,
      )
      .get(sourceId) as { model_version: string } | undefined;
    return row?.model_version ?? null;
  }

  count(sourceType?: string): number {
    if (sourceType) {
      const row = this.db
        .prepare(`SELECT COUNT(*) AS cnt FROM embeddings WHERE source_type = ?`)
        .get(sourceType) as { cnt: number };
      return row.cnt;
    }
    const row = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM embeddings`)
      .get() as { cnt: number };
    return row.cnt;
  }
}
