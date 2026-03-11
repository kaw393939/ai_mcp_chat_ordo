import type Database from "better-sqlite3";
import type {
  BM25Index,
  BM25IndexStore,
} from "@/core/search/ports/BM25IndexStore";

interface StatsJson {
  avgDocLength: number;
  docCount: number;
  docLengths: [string, number][];
  termDocFrequencies: [string, number][];
}

function serializeIndex(index: BM25Index): string {
  const obj: StatsJson = {
    avgDocLength: index.avgDocLength,
    docCount: index.docCount,
    docLengths: [...index.docLengths],
    termDocFrequencies: [...index.termDocFrequencies],
  };
  return JSON.stringify(obj);
}

function deserializeIndex(json: string): BM25Index {
  const obj = JSON.parse(json) as StatsJson;
  return {
    avgDocLength: obj.avgDocLength,
    docCount: obj.docCount,
    docLengths: new Map(obj.docLengths),
    termDocFrequencies: new Map(obj.termDocFrequencies),
  };
}

export class SQLiteBM25IndexStore implements BM25IndexStore {
  constructor(private db: Database.Database) {}

  getIndex(sourceType: string): BM25Index | null {
    const row = this.db
      .prepare(`SELECT stats_json FROM bm25_stats WHERE source_type = ?`)
      .get(sourceType) as { stats_json: string } | undefined;
    return row ? deserializeIndex(row.stats_json) : null;
  }

  saveIndex(sourceType: string, index: BM25Index): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO bm25_stats (source_type, stats_json, updated_at) VALUES (?, ?, datetime('now'))`,
      )
      .run(sourceType, serializeIndex(index));
  }

  isStale(sourceType: string): boolean {
    const statsRow = this.db
      .prepare(
        `SELECT updated_at FROM bm25_stats WHERE source_type = ?`,
      )
      .get(sourceType) as { updated_at: string } | undefined;

    if (!statsRow) return true;

    const embRow = this.db
      .prepare(
        `SELECT MAX(updated_at) AS latest FROM embeddings WHERE source_type = ?`,
      )
      .get(sourceType) as { latest: string | null } | undefined;

    if (!embRow?.latest) return true;

    return embRow.latest > statsRow.updated_at;
  }
}
