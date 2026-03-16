import type { StreamEvent } from "../entities/chat-stream";

/**
 * Core Interface for AI Streaming
 * 
 * Defines the contract for external AI providers.
 * Adheres to the Adapter pattern (GoF).
 */
export interface ChatStream {
  events(): AsyncIterableIterator<StreamEvent>;
  cancel(): void;
}
export interface ChatStreamProvider {
  fetchStream(messages: { role: string; content: string }[], options?: { conversationId?: string }): Promise<ChatStream>;
}
