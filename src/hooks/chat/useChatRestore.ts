import { useEffect, type Dispatch } from "react";

import type { ChatAction } from "./chatState";
import { restoreActiveConversation } from "./chatConversationApi";

interface UseChatRestoreOptions {
  dispatch: Dispatch<ChatAction>;
  setConversationId: (conversationId: string | null) => void;
  setIsLoadingMessages: (isLoading: boolean) => void;
}

export function useChatRestore({
  dispatch,
  setConversationId,
  setIsLoadingMessages,
}: UseChatRestoreOptions): void {
  useEffect(() => {
    const loadActiveConversation = async () => {
      setIsLoadingMessages(true);

      try {
        const result = await restoreActiveConversation();

        if (result.status === "missing") {
          return;
        }

        if (result.status === "unauthorized") {
          console.warn(
            "Active conversation restore unexpectedly required authentication.",
          );
          return;
        }

        if (result.status === "network-error") {
          return;
        }

        if (result.status === "error") {
          console.error(
            `Failed to restore active conversation: ${result.statusCode ?? "unknown"}`,
          );
          return;
        }

        if (result.payload) {
          setConversationId(result.payload.conversationId);
          dispatch({ type: "REPLACE_ALL", messages: result.payload.messages });
        }
      } finally {
        setIsLoadingMessages(false);
      }
    };

    void loadActiveConversation();
  }, [dispatch, setConversationId, setIsLoadingMessages]);
}