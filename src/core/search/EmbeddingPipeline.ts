import type { Chunker, ChunkMetadata } from "./ports/Chunker";
import type { Embedder } from "./ports/Embedder";
import type { EmbeddingRecord, VectorStore } from "./ports/VectorStore";
import type { ChangeDetector } from "./ChangeDetector";
import type { IndexResult, RebuildResult, DocumentInput } from "./types";
import { l2Normalize } from "./l2Normalize";

/**
 * Orchestrates chunk → embed → L2-normalize → store for any source type.
 * Change detection is delegated to ChangeDetector (UB-2).
 */
export class EmbeddingPipeline {
  constructor(
    private chunker: Chunker,
    private embedder: Embedder,
    private vectorStore: VectorStore,
    private changeDetector: ChangeDetector,
    private modelVersion: string,
  ) {}

  async indexDocument(params: {
    sourceType: string;
    sourceId: string;
    content: string;
    contentHash: string;
    metadata: ChunkMetadata;
  }): Promise<IndexResult> {
    const { sourceType, sourceId, content, contentHash, metadata } = params;

    // Check content hash + model version — skip if nothing changed
    const contentChanged = this.changeDetector.hasChanged(sourceId, contentHash);
    const modelChanged = this.changeDetector.hasModelChanged(
      sourceId,
      this.modelVersion,
    );

    if (!contentChanged && !modelChanged) {
      return { sourceId, status: "unchanged", chunksUpserted: 0 };
    }

    const isUpdate = this.vectorStore.getContentHash(sourceId) !== null;

    // Chunk content — MarkdownChunker.chunk() builds embeddingInput internally
    const chunks = this.chunker.chunk(sourceId, content, metadata);

    // Embed all chunks
    const embeddingInputs = chunks.map((c) => c.embeddingInput);
    const vectors = await this.embedder.embedBatch(embeddingInputs);

    // L2-normalize each vector
    const normalized = vectors.map((v) => l2Normalize(v));

    // Build EmbeddingRecord[] with deterministic IDs
    const records: EmbeddingRecord[] = chunks.map((chunk, i) => ({
      id: `${sourceType}:${sourceId}:${i}`,
      sourceType,
      sourceId,
      chunkIndex: i,
      chunkLevel: chunk.level,
      heading: chunk.heading,
      content: chunk.content,
      embeddingInput: chunk.embeddingInput,
      contentHash,
      modelVersion: this.modelVersion,
      embedding: normalized[i],
      metadata: chunk.metadata,
    }));

    // Delete old chunks then upsert new
    this.vectorStore.delete(sourceId);
    this.vectorStore.upsert(records);

    return {
      sourceId,
      status: isUpdate ? "updated" : "created",
      chunksUpserted: records.length,
    };
  }

  async rebuildAll(
    sourceType: string,
    documents: DocumentInput[],
  ): Promise<RebuildResult> {
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let totalChunks = 0;

    for (const doc of documents) {
      const result = await this.indexDocument({
        sourceType,
        sourceId: doc.sourceId,
        content: doc.content,
        contentHash: doc.contentHash,
        metadata: doc.metadata,
      });

      if (result.status === "created") created++;
      else if (result.status === "updated") updated++;
      else unchanged++;

      totalChunks += result.chunksUpserted;
    }

    // Detect and delete orphans
    const activeIds = new Set(documents.map((d) => d.sourceId));
    const orphaned = this.changeDetector.findOrphaned(sourceType, activeIds);
    for (const orphanId of orphaned) {
      this.vectorStore.delete(orphanId);
    }

    return {
      created,
      updated,
      unchanged,
      orphansDeleted: orphaned.length,
      totalChunks,
    };
  }
}
