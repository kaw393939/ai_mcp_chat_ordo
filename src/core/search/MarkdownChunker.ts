import type {
  Chunk,
  ChunkMetadata,
  Chunker,
  ChunkerOptions,
  BookChunkMetadata,
} from "./ports/Chunker";

const DEFAULT_OPTIONS: ChunkerOptions = {
  maxChunkWords: 400,
  minChunkWords: 50,
};

/**
 * Heading-aware recursive markdown splitter (UB-1: pure Core, zero infra imports).
 * Split priority: ## → ### → paragraph breaks → single newlines.
 * Never splits inside fenced code blocks, lists, blockquotes, or tables.
 */
export class MarkdownChunker implements Chunker {
  chunk(
    sourceId: string,
    content: string,
    metadata: ChunkMetadata,
    options?: ChunkerOptions,
  ): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const chunks: Chunk[] = [];

    // 1. Document-level chunk (1 per chapter)
    chunks.push(
      this.buildDocumentChunk(sourceId, content, metadata),
    );

    // 2. Section-level + passage-level chunks
    const sections = this.splitOnHeadings(content, /^## (?!#)/m);

    for (const section of sections) {
      const heading = this.extractHeading(section.text, /^## (.+)$/m);
      const sectionBody = section.text.replace(/^## .+\n?/, "");
      const sectionWordCount = this.wordCount(sectionBody);

      if (sectionWordCount <= opts.maxChunkWords && sectionWordCount >= opts.minChunkWords) {
        // Section fits as one chunk
        chunks.push(
          this.buildChunk(sectionBody.trim(), heading, section.startOffset, content, metadata, "section"),
        );
      } else if (sectionWordCount < opts.minChunkWords) {
        // Too small for own section — still include as passage if has content
        if (sectionBody.trim().length > 0) {
          chunks.push(
            this.buildChunk(sectionBody.trim(), heading, section.startOffset, content, metadata, "passage"),
          );
        }
      } else {
        // Section-level chunk (summary)
        chunks.push(
          this.buildChunk(sectionBody.trim(), heading, section.startOffset, content, metadata, "section"),
        );

        // Recurse into passages
        const passages = this.splitSectionIntoPassages(sectionBody, heading, section.startOffset, content, metadata, opts);
        chunks.push(...passages);
      }
    }

    // Merge undersized trailing passages
    return this.mergeUndersized(chunks, opts.minChunkWords);
  }

  private buildDocumentChunk(
    _sourceId: string,
    content: string,
    metadata: ChunkMetadata,
  ): Chunk {
    const headings = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    const firstWords = content.split(/\s+/).slice(0, 200).join(" ");
    const prefix = this.buildPrefixFromMetadata(metadata, null);
    const docSummary = headings.length > 0
      ? `${headings.join(" > ")} > ${firstWords}`
      : firstWords;

    return {
      content: content.slice(0, 2000),
      embeddingInput: transformForEmbedding(docSummary, prefix),
      level: "document",
      heading: null,
      startOffset: 0,
      endOffset: content.length,
      metadata,
    };
  }

  private splitSectionIntoPassages(
    sectionText: string,
    sectionHeading: string | null,
    sectionOffset: number,
    fullContent: string,
    metadata: ChunkMetadata,
    opts: ChunkerOptions,
  ): Chunk[] {
    // Try H3 headings first
    const h3Sections = this.splitOnHeadings(sectionText, /^### (?!#)/m);
    if (h3Sections.length > 1) {
      const passages: Chunk[] = [];
      for (const sub of h3Sections) {
        const subHeading = this.extractHeading(sub.text, /^### (.+)$/m) ?? sectionHeading;
        const subBody = sub.text.replace(/^### .+\n?/, "").trim();
        if (this.wordCount(subBody) > opts.maxChunkWords) {
          // Still too large — split on paragraphs
          passages.push(
            ...this.splitOnParagraphs(subBody, subHeading, sectionOffset + sub.startOffset, fullContent, metadata, opts),
          );
        } else if (subBody.length > 0) {
          passages.push(
            this.buildChunk(subBody, subHeading, sectionOffset + sub.startOffset, fullContent, metadata, "passage"),
          );
        }
      }
      return passages;
    }

    // No H3s — split on paragraphs
    return this.splitOnParagraphs(sectionText, sectionHeading, sectionOffset, fullContent, metadata, opts);
  }

  private splitOnParagraphs(
    text: string,
    heading: string | null,
    baseOffset: number,
    fullContent: string,
    metadata: ChunkMetadata,
    opts: ChunkerOptions,
  ): Chunk[] {
    const blocks = this.splitPreservingAtomicBlocks(text);
    const passages: Chunk[] = [];
    let currentText = "";
    let currentOffset = baseOffset;

    for (const block of blocks) {
      const combined = currentText ? `${currentText}\n\n${block}` : block;
      if (this.wordCount(combined) > opts.maxChunkWords && currentText) {
        // Flush current
        passages.push(
          this.buildChunk(currentText.trim(), heading, currentOffset, fullContent, metadata, "passage"),
        );
        currentText = block;
        currentOffset = baseOffset + text.indexOf(block, currentOffset - baseOffset);
      } else {
        currentText = combined;
      }
    }

    if (currentText.trim()) {
      passages.push(
        this.buildChunk(currentText.trim(), heading, currentOffset, fullContent, metadata, "passage"),
      );
    }

    return passages;
  }

  /**
   * Split text on paragraph breaks (\n\n), but keep atomic blocks intact:
   * fenced code blocks, lists, blockquotes, tables.
   */
  private splitPreservingAtomicBlocks(text: string): string[] {
    const blocks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      remaining = remaining.replace(/^\n+/, "");
      if (remaining.length === 0) break;

      // Fenced code block
      const codeMatch = remaining.match(/^```[\s\S]*?```/);
      if (codeMatch) {
        blocks.push(codeMatch[0]);
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // List block (consecutive lines starting with -, *, +, or 1.)
      const listMatch = remaining.match(/^(?:[ \t]*[-*+]|\d+\.)[ \t].+(?:\n(?:[ \t]*[-*+]|\d+\.)[ \t].+|\n[ \t]+.+)*/);
      if (listMatch) {
        blocks.push(listMatch[0]);
        remaining = remaining.slice(listMatch[0].length);
        continue;
      }

      // Blockquote block
      const bqMatch = remaining.match(/^>[ \t]?.+(?:\n>[ \t]?.+)*/);
      if (bqMatch) {
        blocks.push(bqMatch[0]);
        remaining = remaining.slice(bqMatch[0].length);
        continue;
      }

      // Table block
      const tableMatch = remaining.match(/^\|.+\|(?:\n\|.+\|)*/);
      if (tableMatch) {
        blocks.push(tableMatch[0]);
        remaining = remaining.slice(tableMatch[0].length);
        continue;
      }

      // Regular paragraph — take until double newline or end
      const paraMatch = remaining.match(/^[\s\S]+?(?=\n\n|$)/);
      if (paraMatch) {
        blocks.push(paraMatch[0]);
        remaining = remaining.slice(paraMatch[0].length);
        continue;
      }

      // Fallback: take rest
      blocks.push(remaining);
      break;
    }

    return blocks.filter((b) => b.trim().length > 0);
  }

  private splitOnHeadings(
    text: string,
    headingPattern: RegExp,
  ): { text: string; startOffset: number }[] {
    const sections: { text: string; startOffset: number }[] = [];
    const lines = text.split("\n");
    let currentSection = "";
    let currentOffset = 0;
    let charPos = 0;
    let inCodeBlock = false;

    for (const line of lines) {
      // Track fenced code blocks
      if (line.trimStart().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
      }

      if (!inCodeBlock && headingPattern.test(line) && currentSection.trim()) {
        sections.push({ text: currentSection, startOffset: currentOffset });
        currentSection = "";
        currentOffset = charPos;
      }

      currentSection += (currentSection ? "\n" : "") + line;
      charPos += line.length + 1; // +1 for \n
    }

    if (currentSection.trim()) {
      sections.push({ text: currentSection, startOffset: currentOffset });
    }

    return sections;
  }

  private extractHeading(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private buildChunk(
    text: string,
    heading: string | null,
    startOffset: number,
    _fullContent: string,
    metadata: ChunkMetadata,
    level: "section" | "passage",
  ): Chunk {
    const prefix = this.buildPrefixFromMetadata(metadata, heading);
    return {
      content: text,
      embeddingInput: transformForEmbedding(text, prefix),
      level,
      heading,
      startOffset,
      endOffset: startOffset + text.length,
      metadata,
    };
  }

  private buildPrefixFromMetadata(
    metadata: ChunkMetadata,
    sectionHeading: string | null,
  ): string {
    if (metadata.sourceType === "book_chunk") {
      return buildPrefix(
        metadata.bookTitle,
        metadata.chapterTitle,
        metadata.chapterFirstSentence,
        sectionHeading,
      );
    }
    // Future: conversation prefix
    return "";
  }

  private mergeUndersized(chunks: Chunk[], minWords: number): Chunk[] {
    const result: Chunk[] = [];
    for (const chunk of chunks) {
      // Never merge document-level chunks
      if (chunk.level === "document") {
        result.push(chunk);
        continue;
      }

      const last = result[result.length - 1];
      if (
        last &&
        last.level !== "document" &&
        this.wordCount(chunk.content) < minWords
      ) {
        // Merge with previous
        const merged = `${last.content}\n\n${chunk.content}`;
        const prefix = this.buildPrefixFromMetadata(last.metadata, last.heading);
        result[result.length - 1] = {
          ...last,
          content: merged,
          embeddingInput: transformForEmbedding(merged, prefix),
          endOffset: chunk.endOffset,
        };
      } else {
        result.push(chunk);
      }
    }
    return result;
  }

  private wordCount(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }
}

/** Contextual prefix for embedding input (GH-2, §3.3) */
export function buildPrefix(
  bookTitle: string,
  chapterTitle: string,
  chapterFirstSentence: string,
  sectionHeading: string | null,
): string {
  const chapterContext = `${bookTitle}: ${chapterTitle}. ${chapterFirstSentence}`;
  return sectionHeading ? `${chapterContext} > ${sectionHeading}` : chapterContext;
}

/** Strip markdown formatting for embedding input (GB-2, §3.8) */
export function transformForEmbedding(rawText: string, prefix: string): string {
  const stripped = rawText
    .replace(/```[\s\S]*?```/g, "") // remove fenced code blocks
    .replace(/^#{1,6}\s+/gm, "") // remove heading markers
    .replace(/\*\*|__|[*_`]/g, "") // remove bold/italic/code markers
    .replace(/^>\s?/gm, "") // remove blockquote markers
    .replace(/^[-*+]\s/gm, "") // remove list markers
    .replace(/\|/g, " ") // remove table pipes
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
  return `${prefix} > ${stripped}`;
}
