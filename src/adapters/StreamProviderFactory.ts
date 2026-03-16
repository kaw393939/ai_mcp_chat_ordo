import type { ChatStreamProvider } from "../core/use-cases/ChatStreamProvider";
import { ChatStreamAdapter } from "./ChatStreamAdapter";

/**
 * Stream Provider Factory
 * 
 * Facilitates DIP by providing concrete implementations of ChatStreamProvider.
 */

let provider: ChatStreamProvider | null = null;

export function getChatStreamProvider(): ChatStreamProvider {
  if (!provider) {
    provider = new ChatStreamAdapter();
  }
  return provider;
}
