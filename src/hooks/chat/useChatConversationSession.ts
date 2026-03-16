import { useCallback, useState, type Dispatch } from "react";

import type { ChatMessage } from "@/core/entities/chat-message";

import type { ChatAction } from "./chatState";
import { archiveActiveConversation } from "./chatConversationApi";
import { useChatRestore } from "./useChatRestore";

interface UseChatConversationSessionOptions {
  dispatch: Dispatch<ChatAction>;
  createInitialMessages: () => ChatMessage[];
}

interface ChatConversationSession {
  conversationId: string | null;
  isLoadingMessages: boolean;
  setConversationId: (conversationId: string | null) => void;
  newConversation: () => void;
  archiveConversation: () => Promise<void>;
}

export function useChatConversationSession({
  dispatch,
  createInitialMessages,
}: UseChatConversationSessionOptions): ChatConversationSession {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const newConversation = useCallback(() => {
    setConversationId(null);
    dispatch({
      type: "REPLACE_ALL",
      messages: createInitialMessages(),
    });
  }, [createInitialMessages, dispatch]);

  useChatRestore({
    dispatch,
    setConversationId,
    setIsLoadingMessages,
  });

  const archiveConversation = useCallback(async () => {
    const archived = await archiveActiveConversation();
    if (archived) {
      newConversation();
    }
  }, [newConversation]);

  return {
    conversationId,
    isLoadingMessages,
    setConversationId,
    newConversation,
    archiveConversation,
  };
}