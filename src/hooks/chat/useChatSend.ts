import { useCallback, useRef, type Dispatch } from "react";

import type { ChatMessage } from "@/core/entities/chat-message";
import { MessageFactory } from "@/core/entities/MessageFactory";

import type { ChatAction } from "./chatState";
import {
  cleanupChatAttachments,
  uploadChatAttachments,
} from "./chatAttachmentApi";
import { useChatStreamRuntime } from "./useChatStreamRuntime";

interface UseChatSendOptions {
  conversationId: string | null;
  dispatch: Dispatch<ChatAction>;
  messages: ChatMessage[];
  setConversationId: (conversationId: string | null) => void;
  setIsSending: (isSending: boolean) => void;
}

export function useChatSend({
  conversationId,
  dispatch,
  messages,
  setConversationId,
  setIsSending,
}: UseChatSendOptions) {
  const inFlightRef = useRef(false);
  const runStream = useChatStreamRuntime({
    conversationId,
    dispatch,
    setConversationId,
  });

  return useCallback(
    async (messageText: string, files: File[] = []) => {
      const trimmedMessage = messageText.trim();

      if (!trimmedMessage && files.length === 0) {
        return { ok: false, error: "Cannot send an empty message." };
      }

      if (inFlightRef.current) {
        return { ok: false, error: "A message is already sending." };
      }

      inFlightRef.current = true;
      setIsSending(true);
      let uploadedAttachmentIds: string[] = [];

      try {
        const attachmentParts = files.length
          ? await uploadChatAttachments(files, conversationId)
          : [];
        uploadedAttachmentIds = attachmentParts.map((attachment) => attachment.assetId);
        const userParts = [
          ...(trimmedMessage ? [{ type: "text" as const, text: trimmedMessage }] : []),
          ...attachmentParts,
        ];
        const userMessage = MessageFactory.createUserMessage(
          trimmedMessage,
          userParts,
        );
        const nextMessages = [...messages, userMessage];
        const assistantIndex = nextMessages.length;

        dispatch({
          type: "REPLACE_ALL",
          messages: [...nextMessages, MessageFactory.createAssistantMessage()],
        });

        const historyForBackend = nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        }));

        await runStream(historyForBackend, assistantIndex, attachmentParts);
        return { ok: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unexpected chat error.";
        await cleanupChatAttachments(uploadedAttachmentIds);
        dispatch({
          type: "SET_ERROR",
          index: messages.length + 1,
          error: errorMessage,
        });
        return { ok: false, error: errorMessage };
      } finally {
        setIsSending(false);
        inFlightRef.current = false;
      }
    },
    [
      conversationId,
      dispatch,
      messages,
      setIsSending,
      runStream,
    ],
  );
}