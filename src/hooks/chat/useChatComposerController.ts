import { useCallback, type RefObject } from "react";

import type { MentionItem } from "@/core/entities/mentions";
import { useMentions } from "@/hooks/useMentions";
import { useCommandRegistry } from "@/hooks/useCommandRegistry";

import { useChatComposerState } from "./useChatComposerState";

interface UseChatComposerControllerOptions {
  isSending: boolean;
  onSendMessage: (
    messageText: string,
    pendingFiles: File[],
  ) => Promise<{ ok: boolean; error?: string }>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function useChatComposerController({
  isSending,
  onSendMessage,
  textareaRef,
}: UseChatComposerControllerOptions) {
  const composer = useChatComposerState(isSending);
  const { executeCommand, findCommands } = useCommandRegistry();
  const mentions = useMentions(textareaRef, { findCommands });

  const handleInputChange = useCallback(
    (value: string, selectionStart: number) => {
      composer.updateInput(value);
      mentions.handleInput(value, selectionStart);
      composer.setMentionIndex(0);
    },
    [composer, mentions],
  );

  const handleSuggestionSelect = useCallback(
    (item: MentionItem) => {
      if (mentions.activeTrigger?.char === "/") {
        if (executeCommand(item.id)) {
          composer.clearComposer();
          return;
        }
      }

      const nextText = mentions.insertMention(item);
      composer.updateInput(nextText);
    },
    [composer, executeCommand, mentions],
  );

  const handleSend = useCallback(async () => {
    if (isSending || !composer.canSend) {
      return;
    }

    const draft = composer.input.trim();
    if (!draft && composer.pendingFiles.length === 0) {
      return;
    }

    const queuedFiles = [...composer.pendingFiles];
    const result = await onSendMessage(draft, queuedFiles);
    if (result.ok) {
      composer.clearComposer();
    }
  }, [composer, isSending, onSendMessage]);

  return {
    activeTrigger: mentions.activeTrigger,
    canSend: composer.canSend,
    handleFileRemove: composer.handleFileRemove,
    handleFileSelect: composer.handleFileSelect,
    handleInputChange,
    handleSend,
    handleSuggestionSelect,
    input: composer.input,
    mentionIndex: composer.mentionIndex,
    pendingFiles: composer.pendingFiles,
    setMentionIndex: composer.setMentionIndex,
    suggestions: mentions.suggestions,
  };
}