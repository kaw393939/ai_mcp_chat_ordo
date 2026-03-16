import { useCallback, type Dispatch } from "react";

import { getChatStreamProvider } from "@/adapters/StreamProviderFactory";
import {
  ConversationIdStrategy,
  ErrorStrategy,
  StreamProcessor,
  TextDeltaStrategy,
  ToolCallStrategy,
  ToolResultStrategy,
} from "@/lib/chat/StreamStrategy";
import type { AttachmentPart } from "@/lib/chat/message-attachments";

import type { ChatAction } from "./chatState";

const streamAdapter = getChatStreamProvider();
const streamProcessor = new StreamProcessor([
  new TextDeltaStrategy(),
  new ToolCallStrategy(),
  new ToolResultStrategy(),
  new ErrorStrategy(),
  new ConversationIdStrategy(),
]);

interface StreamConversationIdAction {
  type: "SET_CONVERSATION_ID";
  conversationId: string;
}

interface UseChatStreamRuntimeOptions {
  conversationId: string | null;
  dispatch: Dispatch<ChatAction>;
  setConversationId: (conversationId: string | null) => void;
}

export function useChatStreamRuntime({
  conversationId,
  dispatch,
  setConversationId,
}: UseChatStreamRuntimeOptions) {
  return useCallback(
    async (
      historyForBackend: Array<{ role: string; content: string }>,
      assistantIndex: number,
      attachments: AttachmentPart[],
    ) => {
      const stream = await streamAdapter.fetchStream(historyForBackend, {
        conversationId: conversationId || undefined,
        attachments,
      });

      const streamDispatch = (
        action: ChatAction | StreamConversationIdAction,
      ) => {
        if (action.type === "SET_CONVERSATION_ID") {
          setConversationId(action.conversationId);
          return;
        }

        dispatch(action);
      };

      for await (const event of stream.events()) {
        streamProcessor.process(event, {
          dispatch: streamDispatch,
          assistantIndex,
        });
      }
    },
    [conversationId, dispatch, setConversationId],
  );
}