"use client";

import {
  createContext,
  useContext,
  useReducer,
  useState,
} from "react";
import type { ReactNode } from "react";
export type { MessagePart } from "@/core/entities/message-parts";
export type { ChatMessage } from "@/core/entities/chat-message";
import type { ChatMessage } from "@/core/entities/chat-message";
import {
  chatReducer,
  createInitialChatMessages,
} from "@/hooks/chat/chatState";
import { useChatConversationSession } from "@/hooks/chat/useChatConversationSession";
import { useChatSend } from "@/hooks/chat/useChatSend";

interface ChatContextType {
  messages: ChatMessage[];
  isSending: boolean;
  conversationId: string | null;
  isLoadingMessages: boolean;
  sendMessage: (
    messageText: string,
    files?: File[],
  ) => Promise<{ ok: boolean; error?: string }>;
  newConversation: () => void;
  archiveConversation: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, dispatch] = useReducer(
    chatReducer,
    undefined,
    createInitialChatMessages,
  );
  const [isSending, setIsSending] = useState(false);

  const {
    conversationId,
    isLoadingMessages,
    setConversationId,
    newConversation,
    archiveConversation,
  } = useChatConversationSession({
    dispatch,
    createInitialMessages: createInitialChatMessages,
  });

  const sendMessage = useChatSend({
    conversationId,
    dispatch,
    messages,
    setConversationId,
    setIsSending,
  });

  return (
    <ChatContext.Provider value={{
      messages, isSending, conversationId,
      isLoadingMessages,
      sendMessage, newConversation, archiveConversation
    }}>
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
