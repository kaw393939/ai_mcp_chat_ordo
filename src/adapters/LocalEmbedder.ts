import type { Embedder } from "@/core/search/ports/Embedder";

type PipelineOutput = { data: ArrayLike<number> };
type Pipeline = (text: string, options?: Record<string, unknown>) => Promise<PipelineOutput>;

export class LocalEmbedder implements Embedder {
  private pipe: Pipeline | null = null;

  async embed(text: string): Promise<Float32Array> {
    const p = await this.getPipeline();
    const output = await p(text, { pooling: "mean", normalize: false });
    return new Float32Array(output.data);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  dimensions(): number {
    return 384;
  }

  isReady(): boolean {
    return this.pipe !== null;
  }

  private async getPipeline(): Promise<Pipeline> {
    if (!this.pipe) {
      const { pipeline } = await import("@huggingface/transformers");
      // @ts-expect-error — HuggingFace pipeline() union type too complex for TS
      this.pipe = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
      );
    }

    if (!this.pipe) {
      throw new Error("Embedding pipeline failed to initialize.");
    }

    return this.pipe;
  }
}
