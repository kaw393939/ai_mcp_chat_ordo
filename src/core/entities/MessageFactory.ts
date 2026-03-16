import type { MessagePart } from "./message-parts";
import type { ChatMessage } from "./chat-message";

/**
 * Message Factory (GoF Factory Method)
 * 
 * Standardizes the creation of ChatMessage entities ensuring 
 * consistent default values for id, timestamps, and metadata.
 */
export class MessageFactory {
  static create(
    role: "user" | "assistant", 
    content: string, 
    parts: MessagePart[] = []
  ): ChatMessage {
    return {
      id: crypto.randomUUID(),
      role,
      content,
      parts,
      timestamp: new Date()
    };
  }

  static createUserMessage(content: string, parts?: MessagePart[]): ChatMessage {
    return this.create("user", content, parts ?? (content ? [{ type: "text", text: content }] : []));
  }

  static createAssistantMessage(content: string = "", parts: MessagePart[] = []): ChatMessage {
    return this.create("assistant", content, parts);
  }

  static createHeroMessage(content: string, suggestions: string[]): ChatMessage {
    const suggestionTag = `\n\n__suggestions__:[${suggestions.map(s => `"${s}"`).join(",")}]`;
    return this.create("assistant", content + suggestionTag);
  }
}
