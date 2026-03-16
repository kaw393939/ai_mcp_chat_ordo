import { MessageFactory } from "@/core/entities/MessageFactory";
import type { ChatMessage } from "@/core/entities/chat-message";

export type ChatAction =
  | { type: "REPLACE_ALL"; messages: ChatMessage[] }
  | { type: "APPEND_TEXT"; index: number; delta: string }
  | {
      type: "APPEND_TOOL_CALL";
      index: number;
      name: string;
      args: Record<string, unknown>;
    }
  | {
      type: "APPEND_TOOL_RESULT";
      index: number;
      name: string;
      result: unknown;
    }
  | { type: "SET_ERROR"; index: number; error: string };

const HERO_MESSAGE =
  "The PD Advisor helps you build high-performance products by combining deep architectural wisdom with modern AI workflows. I can help you navigate the library, check your development patterns, or identify the best practitioners for your next sprint.";

const HERO_SUGGESTIONS = [
  "Explore the Library",
  "Check Architectural Patterns",
  "Find Practitioners",
  "Switch to Bauhaus Theme",
];

export function createInitialChatMessages(): ChatMessage[] {
  return [MessageFactory.createHeroMessage(HERO_MESSAGE, HERO_SUGGESTIONS)];
}

export function chatReducer(
  state: ChatMessage[],
  action: ChatAction,
): ChatMessage[] {
  switch (action.type) {
    case "REPLACE_ALL":
      return action.messages;
    case "APPEND_TEXT": {
      const updated = [...state];
      const message = updated[action.index];
      if (!message) {
        return state;
      }

      const parts = [...(message.parts || [])];
      const lastPart = parts[parts.length - 1];

      if (lastPart && lastPart.type === "text") {
        parts[parts.length - 1] = {
          ...lastPart,
          text: lastPart.text + action.delta,
        };
      } else {
        parts.push({ type: "text", text: action.delta });
      }

      updated[action.index] = {
        ...message,
        content: (message.content || "") + action.delta,
        parts,
      };

      return updated;
    }
    case "APPEND_TOOL_CALL": {
      const updated = [...state];
      const message = updated[action.index];
      if (!message) {
        return state;
      }

      updated[action.index] = {
        ...message,
        parts: [
          ...(message.parts || []),
          { type: "tool_call" as const, name: action.name, args: action.args },
        ],
      };

      return updated;
    }
    case "APPEND_TOOL_RESULT": {
      const updated = [...state];
      const message = updated[action.index];
      if (!message) {
        return state;
      }

      updated[action.index] = {
        ...message,
        parts: [
          ...(message.parts || []),
          {
            type: "tool_result" as const,
            name: action.name,
            result: action.result,
          },
        ],
      };

      return updated;
    }
    case "SET_ERROR":
      return [
        ...state.slice(0, action.index),
        MessageFactory.createAssistantMessage(action.error),
      ];
    default:
      return state;
  }
}