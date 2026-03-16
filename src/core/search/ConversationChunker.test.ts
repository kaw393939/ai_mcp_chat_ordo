import { describe, it, expect } from "vitest";
import { ConversationChunker } from "@/core/search/ConversationChunker";
import type { ConversationMetadata } from "@/core/search/ports/Chunker";

const baseMeta: ConversationMetadata = {
  sourceType: "conversation",
  conversationId: "conv_1",
  userId: "usr_1",
  role: "user",
  turnIndex: 0,
};

describe("ConversationChunker", () => {
  const chunker = new ConversationChunker();

  it("chunks turn pairs into passage-level chunks", () => {
    const content = [
      "User: What is clean architecture?",
      "Assistant: Clean architecture separates concerns into layers.",
      "User: Can you give an example?",
      "Assistant: A typical example uses entities, use cases, and adapters.",
    ].join("\n");

    const chunks = chunker.chunk("usr_1/conv_1", content, baseMeta);

    const passages = chunks.filter((c) => c.level === "passage");
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("What is clean architecture?");
    expect(passages[0].content).toContain("Clean architecture separates");
    expect(passages[1].content).toContain("Can you give an example?");
    expect(passages[1].embeddingInput).toContain("Conversation:");
  });

  it("creates document-level chunk for summary messages", () => {
    const content = [
      "Summary: Discussion covered clean architecture and dependency inversion.",
      "User: Tell me more about ports.",
      "Assistant: Ports are interfaces that define boundaries.",
    ].join("\n");

    const chunks = chunker.chunk("usr_1/conv_1", content, baseMeta);

    const docs = chunks.filter((c) => c.level === "document");
    expect(docs).toHaveLength(1);
    expect(docs[0].content).toContain("clean architecture");
    expect(docs[0].heading).toBe("Conversation Summary");

    const passages = chunks.filter((c) => c.level === "passage");
    expect(passages).toHaveLength(1);
  });

  it("handles user message without matching assistant reply", () => {
    const content = "User: Hello there";

    const chunks = chunker.chunk("usr_1/conv_1", content, baseMeta);

    const passages = chunks.filter((c) => c.level === "passage");
    expect(passages).toHaveLength(1);
    expect(passages[0].content).toBe("User: Hello there");
  });

  it("returns empty array for empty conversation", () => {
    const chunks = chunker.chunk("usr_1/conv_1", "", baseMeta);
    expect(chunks).toHaveLength(0);
  });
});
