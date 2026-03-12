import type { Embedder } from "./ports/Embedder";
import type { VectorStore } from "./ports/VectorStore";
import { MarkdownChunker } from "./MarkdownChunker";
import { ChangeDetector } from "./ChangeDetector";
import { EmbeddingPipeline } from "./EmbeddingPipeline";

/**
 * Factory for constructing EmbeddingPipeline instances per source type (GoF-2).
 * Encapsulates chunker selection — callers specify intent, not implementation.
 */
export class EmbeddingPipelineFactory {
  constructor(
    private embedder: Embedder,
    private vectorStore: VectorStore,
    private modelVersion: string,
  ) {}

  createForSource(
    sourceType: "book_chunk" | "conversation",
  ): EmbeddingPipeline {
    if (sourceType === "conversation") {
      throw new Error("ConversationChunker not yet implemented");
    }
    const chunker = new MarkdownChunker();
    const changeDetector = new ChangeDetector(this.vectorStore);
    return new EmbeddingPipeline(
      chunker,
      this.embedder,
      this.vectorStore,
      changeDetector,
      this.modelVersion,
    );
  }
}
