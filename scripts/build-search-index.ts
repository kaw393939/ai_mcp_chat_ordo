#!/usr/bin/env tsx
import { createHash } from "crypto";
import { getDb } from "../src/lib/db";
import { getCorpusRepository } from "../src/adapters/RepositoryFactory";
import { LocalEmbedder } from "../src/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "../src/adapters/SQLiteVectorStore";
import { SQLiteBM25IndexStore } from "../src/adapters/SQLiteBM25IndexStore";
import { EmbeddingPipelineFactory } from "../src/core/search/EmbeddingPipelineFactory";
import { validateEmbeddingQuality } from "../src/core/search/EmbeddingValidator";
import type { BM25Index } from "../src/core/search/ports/BM25IndexStore";
import type { DocumentChunkMetadata } from "../src/core/search/ports/Chunker";
import { corpusConfig } from "../src/lib/corpus-config";

const MODEL_VERSION = "all-MiniLM-L6-v2@1.0";
const force = process.argv.includes("--force");

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Simple whitespace tokenizer for BM25 — lowercase, strip punctuation, split on whitespace */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

async function main() {
  const startTime = Date.now();

  // Initialize infrastructure
  const db = getDb();
  const embedder = new LocalEmbedder();
  const vectorStore = new SQLiteVectorStore(db);
  const bm25Store = new SQLiteBM25IndexStore(db);
  const factory = new EmbeddingPipelineFactory(
    embedder,
    vectorStore,
    MODEL_VERSION,
  );
  const pipeline = factory.createForSource(corpusConfig.sourceType);

  // Load all books (for title lookup) and chapters
  const bookRepo = getCorpusRepository();
  const [books, chapters] = await Promise.all([
    bookRepo.getAllBooks(),
    bookRepo.getAllChapters(),
  ]);
  const bookTitleMap = new Map(books.map((b) => [b.slug, b.title]));
  const bookIdMap = new Map(books.map((b) => [b.slug, b.id]));

  console.log(`Loading ${chapters.length} chapters from ${books.length} books...`);

  // If --force, delete all embeddings first
  if (force) {
    console.log("Force rebuild: clearing all embeddings...");
    for (const ch of chapters) {
      vectorStore.delete(`${ch.bookSlug}/${ch.chapterSlug}`);
    }
  }

  // Build documents array for rebuildAll
  const documents = chapters.map((ch) => ({
    sourceId: `${ch.bookSlug}/${ch.chapterSlug}`,
    content: ch.content,
    contentHash: sha256(ch.content),
    metadata: {
      sourceType: corpusConfig.sourceType,
      documentSlug: ch.bookSlug,
      sectionSlug: ch.chapterSlug,
      documentTitle: bookTitleMap.get(ch.bookSlug) ?? ch.bookSlug,
      documentId: bookIdMap.get(ch.bookSlug) ?? ch.bookSlug,
      sectionTitle: ch.title,
      sectionFirstSentence: ch.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
      bookSlug: ch.bookSlug,
      chapterSlug: ch.chapterSlug,
      bookTitle: bookTitleMap.get(ch.bookSlug) ?? ch.bookSlug,
      bookNumber: bookIdMap.get(ch.bookSlug) ?? ch.bookSlug,
      chapterTitle: ch.title,
      chapterFirstSentence: ch.content.split(/[.!?]\s/)[0]?.slice(0, 200) ?? "",
    } satisfies DocumentChunkMetadata,
  }));

  // Run incremental rebuild
  const result = await pipeline.rebuildAll(corpusConfig.sourceType, documents);

  console.log(`\nEmbedding Results:`);
  console.log(`  Chapters: ${chapters.length} (${result.created} new, ${result.updated} updated, ${result.unchanged} unchanged)`);
  console.log(`  Chunks:   ${result.totalChunks} total`);
  console.log(`  Orphans:  ${result.orphansDeleted} deleted`);
  console.log(`  Model:    ${MODEL_VERSION}`);

  // Rebuild BM25 index from all stored embeddings
  const allRecords = vectorStore.getAll({ sourceType: corpusConfig.sourceType });
  const docLengths = new Map<string, number>();
  const termDocFrequencies = new Map<string, number>();
  let totalLength = 0;

  for (const record of allRecords) {
    const tokens = tokenize(record.content);
    docLengths.set(record.id, tokens.length);
    totalLength += tokens.length;

    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      termDocFrequencies.set(term, (termDocFrequencies.get(term) ?? 0) + 1);
    }
  }

  const bm25Index: BM25Index = {
    avgDocLength: allRecords.length > 0 ? totalLength / allRecords.length : 0,
    docCount: allRecords.length,
    docLengths,
    termDocFrequencies,
  };
  bm25Store.saveIndex(corpusConfig.sourceType, bm25Index);
  console.log(`  BM25:     ${bm25Index.docCount} docs, ${bm25Index.termDocFrequencies.size} terms`);

  // Validate embedding quality
  console.log(`\nValidating embedding quality...`);
  const validation = await validateEmbeddingQuality(embedder);
  for (const detail of validation.details) {
    console.log(`  ${detail}`);
  }
  console.log(`  Quality:  ${validation.passed}/${validation.passed + validation.failed} pairs passed`);

  if (validation.failed > 0) {
    console.error("\nWARNING: Embedding quality validation had failures!");
    process.exitCode = 1;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exitCode = 1;
});
