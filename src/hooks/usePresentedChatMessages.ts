import { useMemo } from "react";

import { ChatPresenter, type PresentedMessage } from "@/adapters/ChatPresenter";
import { CommandParserService } from "@/adapters/CommandParserService";
import { MarkdownParserService } from "@/adapters/MarkdownParserService";
import type { ChatMessage } from "@/core/entities/chat-message";

interface PresentedChatMessagesResult {
  presentedMessages: PresentedMessage[];
  dynamicSuggestions: string[];
  scrollDependency: string;
}

export function usePresentedChatMessages(
  messages: ChatMessage[],
): PresentedChatMessagesResult {
  const markdownParser = useMemo(() => new MarkdownParserService(), []);
  const commandParser = useMemo(() => new CommandParserService(), []);
  const presenter = useMemo(
    () => new ChatPresenter(markdownParser, commandParser),
    [commandParser, markdownParser],
  );

  const presentedMessages = useMemo(
    () => presenter.presentMany(messages),
    [messages, presenter],
  );

  const dynamicSuggestions = useMemo(() => {
    const lastMsg = presentedMessages[presentedMessages.length - 1];
    return lastMsg?.role === "assistant" && lastMsg.suggestions
      ? lastMsg.suggestions
      : [];
  }, [presentedMessages]);

  const scrollDependency = useMemo(
    () => {
      const messageSignature = presentedMessages
        .map((message) => `${message.id}:${message.rawContent.length}:${message.attachments.length}`)
        .join("|");

      return `${messageSignature}::suggestions:${dynamicSuggestions.join("|")}`;
    },
    [dynamicSuggestions, presentedMessages],
  );

  return {
    presentedMessages,
    dynamicSuggestions,
    scrollDependency,
  };
}