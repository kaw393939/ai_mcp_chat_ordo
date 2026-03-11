"use client";

import React, { createContext, useContext, useReducer, useState, useMemo, ReactNode } from "react";
export type { MessagePart } from "@/core/entities/message-parts";
import type { MessagePart } from "@/core/entities/message-parts";
export type { ChatMessage } from "@/core/entities/chat-message";
import type { ChatMessage } from "@/core/entities/chat-message";

import { 
  StreamProcessor, 
  TextDeltaStrategy, 
  ToolCallStrategy, 
  ToolResultStrategy, 
  ErrorStrategy 
} from "@/lib/chat/StreamStrategy";
import { getChatStreamProvider } from "@/adapters/StreamProviderFactory";
import { MessageFactory } from "@/core/entities/MessageFactory";

type ChatAction =
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

function chatReducer(state: ChatMessage[], action: ChatAction): ChatMessage[] {
  switch (action.type) {
    case "REPLACE_ALL":
      return action.messages;
    case "APPEND_TEXT": {
      const updated = [...state];
      const msg = updated[action.index];
      if (!msg) return state;
      const parts = [...(msg.parts || [])];
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
        ...msg,
        content: (msg.content || "") + action.delta,
        parts,
      };
      return updated;
    }
    case "APPEND_TOOL_CALL": {
      const updated = [...state];
      const msg = updated[action.index];
      if (!msg) return state;
      const parts = [
        ...(msg.parts || []),
        { type: "tool_call" as const, name: action.name, args: action.args },
      ];
      updated[action.index] = { ...msg, parts };
      return updated;
    }
    case "APPEND_TOOL_RESULT": {
      const updated = [...state];
      const msg = updated[action.index];
      if (!msg) return state;
      const parts = [
        ...(msg.parts || []),
        {
          type: "tool_result" as const,
          name: action.name,
          result: action.result,
        },
      ];
      updated[action.index] = { ...msg, parts };
      return updated;
    }
    case "SET_ERROR": {
      return [
        ...state.slice(0, action.index),
        { id: crypto.randomUUID(), role: "assistant", content: action.error, parts: [], timestamp: new Date() },
      ];
    }
    default:
      return state;
  }
}

interface ChatContextType {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  canSend: boolean;
  setInput: (val: string) => void;
  sendMessage: (eventOrMessage?: { preventDefault: () => void } | string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const streamAdapter = getChatStreamProvider();
const streamProcessor = new StreamProcessor([
  new TextDeltaStrategy(),
  new ToolCallStrategy(),
  new ToolResultStrategy(),
  new ErrorStrategy(),
]);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, dispatch] = useReducer(chatReducer, [
    MessageFactory.createHeroMessage(
      "The PD Advisor helps you build high-performance products by combining deep architectural wisdom with modern AI workflows. I can help you navigate the library, check your development patterns, or identify the best practitioners for your next sprint.",
      ["Explore the Library", "Check Architectural Patterns", "Find Practitioners", "Switch to Bauhaus Theme"]
    )
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending],
  );

  async function sendMessage(eventOrMessage?: { preventDefault: () => void } | string) {
    let messageText = input.trim();
    
    if (typeof eventOrMessage === "string") {
      messageText = eventOrMessage.trim();
    } else {
      eventOrMessage?.preventDefault();
    }

    if (!messageText && !canSend) return;

    const userMessage = MessageFactory.createUserMessage(messageText);
    const nextMessages = [...messages, userMessage];
    const assistantIndex = nextMessages.length;

    dispatch({
      type: "REPLACE_ALL",
      messages: [
        ...nextMessages,
        MessageFactory.createAssistantMessage(),
      ],
    });
    setInput("");
    setIsSending(true);

    try {
      const historyForBackend = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const stream = await streamAdapter.fetchStream(historyForBackend);
      
      for await (const event of stream.events()) {
        streamProcessor.process(event, { dispatch, assistantIndex });
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        index: assistantIndex,
        error: error instanceof Error ? error.message : "Unexpected chat error.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ChatContext.Provider value={{ messages, input, isSending, canSend, setInput, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useGlobalChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useGlobalChat must be used within a ChatProvider");
  }
  return context;
}
