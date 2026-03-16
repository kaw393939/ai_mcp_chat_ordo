import type { MessagePart } from "@/core/entities/message-parts";
import type { ChatMessage } from "@/core/entities/chat-message";

export interface RestoredConversationPayload {
  conversationId: string;
  messages: ChatMessage[];
}

export interface RestoreConversationResult {
  status: "restored" | "missing" | "unauthorized" | "error" | "network-error";
  payload?: RestoredConversationPayload;
  statusCode?: number;
}

export async function restoreActiveConversation(): Promise<RestoreConversationResult> {
  try {
    const response = await fetch("/api/conversations/active");

    if (response.status === 404) {
      return { status: "missing", statusCode: 404 };
    }

    if (response.status === 401) {
      return { status: "unauthorized", statusCode: 401 };
    }

    if (!response.ok) {
      return { status: "error", statusCode: response.status };
    }

    const data = (await response.json()) as {
      conversation: { id: string };
      messages: Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        parts: MessagePart[];
        createdAt: string;
      }>;
    };

    return {
      status: "restored",
      payload: {
        conversationId: data.conversation.id,
        messages: data.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          parts: message.parts,
          timestamp: new Date(message.createdAt),
        })),
      },
    };
  } catch {
    return { status: "network-error" };
  }
}

export async function archiveActiveConversation(): Promise<boolean> {
  try {
    const response = await fetch("/api/conversations/active/archive", {
      method: "POST",
    });

    return response.ok;
  } catch {
    return false;
  }
}