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

export interface FetchChatStreamOptions {
  conversationId?: string;
  attachments?: Array<{
    assetId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;
}

export interface ChatStreamProvider {
  fetchStream(
    messages: { role: string; content: string }[],
    options?: FetchChatStreamOptions,
  ): Promise<ChatStream>;
}
