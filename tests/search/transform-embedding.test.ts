import { describe, expect, it } from "vitest";
import {
  buildPrefix,
  transformForEmbedding,
} from "@/core/search/MarkdownChunker";

describe("embedding input transformation", () => {
  // TEST-VS-11: Chunk embeddingInput starts with BookTitle: ChapterTitle. FirstSentence > SectionHeading > ...
  it("embeddingInput starts with contextual prefix", () => {
    const prefix = buildPrefix(
      "Accessibility",
      "WCAG Compliance",
      "This chapter covers WCAG guidelines.",
      "Color Contrast",
    );
    const result = transformForEmbedding("Some passage about contrast ratios.", prefix);

    expect(result).toMatch(
      /^Accessibility: WCAG Compliance\. This chapter covers WCAG guidelines\. > Color Contrast > /,
    );
    expect(result).toContain("Some passage about contrast ratios.");
  });

  // TEST-VS-52: transformForEmbedding strips markdown, removes code blocks, normalizes whitespace
  it("strips markdown formatting and normalizes whitespace", () => {
    const rawText = [
      "## Heading",
      "",
      "**Bold text** and _italic_ and `code`.",
      "",
      "```typescript",
      "const x = 1;",
      "```",
      "",
      "> Blockquote line",
      "- List item",
      "",
      "| Col1 | Col2 |",
      "| a    | b    |",
    ].join("\n");

    const prefix = buildPrefix("Book", "Chapter", "First sentence.", null);
    const result = transformForEmbedding(rawText, prefix);

    // Code block removed
    expect(result).not.toContain("const x = 1");
    // Heading markers removed
    expect(result).not.toMatch(/^##/);
    // Bold/italic/code markers removed
    expect(result).not.toContain("**");
    expect(result).not.toContain("_italic_");
    // Blockquote markers removed (> removed but content kept)
    expect(result).toContain("Blockquote line");
    expect(result).not.toMatch(/>\s*Blockquote/);
    // Table pipes removed
    expect(result).not.toContain("|");
    // Whitespace normalized — no double spaces or newlines
    expect(result).not.toMatch(/\s{2,}/);
  });

  // TEST-VS-56: Contextual prefix includes chapter first sentence, not just title
  it("prefix includes chapter first sentence for enriched context", () => {
    const prefix = buildPrefix(
      "UX Design",
      "Design Principles",
      "This chapter explores fundamental design principles used in practice.",
      "Heuristic Evaluation",
    );

    expect(prefix).toBe(
      "UX Design: Design Principles. This chapter explores fundamental design principles used in practice. > Heuristic Evaluation",
    );

    // Without section heading
    const prefixNoHeading = buildPrefix(
      "UX Design",
      "Design Principles",
      "This chapter explores fundamental design principles used in practice.",
      null,
    );

    expect(prefixNoHeading).toBe(
      "UX Design: Design Principles. This chapter explores fundamental design principles used in practice.",
    );
  });
});
