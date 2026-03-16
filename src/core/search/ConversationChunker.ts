import type {
  Chunk,
  ChunkMetadata,
  Chunker,
  ChunkerOptions,
  ConversationMetadata,
} from "./ports/Chunker";

/**
 * Chunks a serialized conversation into turn-pair passages for embedding.
 * Summary messages become "document" level chunks (higher weight).
 */
export class ConversationChunker implements Chunker {
  chunk(
    sourceId: string,
    content: string,
    metadata: ChunkMetadata,
    _options?: ChunkerOptions,
  ): Chunk[] {
    if (metadata.sourceType !== "conversation") {
      throw new Error("ConversationChunker requires conversation metadata");
    }

    const convMeta = metadata as ConversationMetadata;
    const lines = content.split("\n");
    const chunks: Chunk[] = [];

    // Parse conversation into turns
    const turns: Array<{ role: string; text: string; offset: number }> = [];
    let currentOffset = 0;

    for (const line of lines) {
      const userMatch = line.match(/^User: (.+)/);
      const assistantMatch = line.match(/^Assistant: (.+)/);
      const summaryMatch = line.match(/^Summary: (.+)/);

      if (summaryMatch) {
        // Summary messages → "document" level chunks
        chunks.push({
          content: summaryMatch[1],
          embeddingInput: `Conversation summary:\n${summaryMatch[1]}`,
          level: "document",
          heading: "Conversation Summary",
          startOffset: currentOffset,
          endOffset: currentOffset + line.length,
          metadata: { ...convMeta, turnIndex: turns.length },
        });
      } else if (userMatch) {
        turns.push({ role: "user", text: userMatch[1], offset: currentOffset });
      } else if (assistantMatch) {
        turns.push({ role: "assistant", text: assistantMatch[1], offset: currentOffset });
      }

      currentOffset += line.length + 1; // +1 for newline
    }

    // Group into turn pairs (user + assistant)
    let turnIndex = 0;
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      if (turn.role === "user") {
        const nextTurn = turns[i + 1];
        const userText = turn.text;
        const assistantText = nextTurn?.role === "assistant" ? nextTurn.text : "";

        const pairContent = assistantText
          ? `User: ${userText}\nAssistant: ${assistantText}`
          : `User: ${userText}`;

        const embeddingInput = `Conversation:\nUser: ${userText}${assistantText ? `\nAssistant: ${assistantText}` : ""}`;

        const endOffset = assistantText && nextTurn
          ? nextTurn.offset + `Assistant: ${assistantText}`.length
          : turn.offset + `User: ${userText}`.length;

        chunks.push({
          content: pairContent,
          embeddingInput,
          level: "passage",
          heading: null,
          startOffset: turn.offset,
          endOffset,
          metadata: { ...convMeta, turnIndex },
        });

        if (nextTurn?.role === "assistant") i++; // skip the assistant turn
        turnIndex++;
      }
    }

    return chunks;
  }
}
