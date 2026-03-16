import type { Message } from "../entities/conversation";

export interface LlmSummarizer {
  summarize(messages: Message[]): Promise<string>;
}
