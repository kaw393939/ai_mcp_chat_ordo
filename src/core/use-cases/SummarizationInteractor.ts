import type { MessageRepository } from "./MessageRepository";
import type { LlmSummarizer } from "./LlmSummarizer";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { Message } from "../entities/conversation";

const SUMMARIZE_THRESHOLD = 40;
const SUMMARIZE_WINDOW = 20;
const activeSummaries = new Set<string>();

export class SummarizationInteractor {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly llmSummarizer: LlmSummarizer,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async summarizeIfNeeded(conversationId: string): Promise<void> {
    if (activeSummaries.has(conversationId)) {
      return;
    }

    activeSummaries.add(conversationId);

    try {
      const messages = await this.messageRepo.listByConversation(conversationId);
      const messageCount = messages.length;

      if (messageCount <= SUMMARIZE_THRESHOLD) return;

      const lastSummary = this.findLastSummary(messages);
      const messagesSinceLastSummary = lastSummary
        ? messages.filter((m) => m.createdAt > lastSummary.createdAt).length
        : messageCount;

      if (messagesSinceLastSummary <= SUMMARIZE_WINDOW) return;

      // Determine which messages to summarize: everything before the last SUMMARIZE_WINDOW messages
      const messagesToKeep = messages.slice(-SUMMARIZE_WINDOW);
      const cutoffMessage = messagesToKeep[0];
      const messagesToSummarize = messages.filter(
        (m) => m.role !== "system" && m.createdAt < cutoffMessage.createdAt,
      );

      if (!cutoffMessage || messagesToSummarize.length === 0) return;

      const lastSummarizedMessage = messagesToSummarize[messagesToSummarize.length - 1];
      if (!lastSummarizedMessage) return;

      const summaryText = await this.llmSummarizer.summarize(messagesToSummarize);

      const tokenEstimate = Math.ceil(summaryText.length / 4);
      await this.messageRepo.create({
        conversationId,
        role: "system",
        content: summaryText,
        parts: [{ type: "summary", text: summaryText, coversUpToMessageId: lastSummarizedMessage.id }],
        tokenEstimate,
      });

      await this.eventRecorder?.record(conversationId, "summarized", {
        messages_covered: messagesToSummarize.length,
        summary_tokens: tokenEstimate,
      });
    } finally {
      activeSummaries.delete(conversationId);
    }
  }

  private findLastSummary(messages: Message[]): Message | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "system" && msg.parts.some((p) => p.type === "summary")) {
        return msg;
      }
    }
    return null;
  }
}
