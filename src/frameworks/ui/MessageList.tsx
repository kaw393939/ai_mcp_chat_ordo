import React from "react";
import type { PresentedMessage } from "../../adapters/ChatPresenter";
import { RichContentRenderer } from "./RichContentRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { BlockNode, InlineNode, RichContent } from "@/core/entities/rich-content";

interface MessageListProps {
  messages: PresentedMessage[];
  isSending: boolean;
  dynamicSuggestions: string[];
  onSuggestionClick: (text: string) => void;
  onLinkClick: (slug: string) => void;
  searchQuery: string;
  isEmbedded?: boolean;
}

const BrandHeader = ({ isEmbedded = false }: { isEmbedded?: boolean }) => (
  <div className={`flex flex-col items-center justify-center px-3 text-center animate-in fade-in slide-in-from-top-4 duration-700 ease-out fill-mode-both sm:px-4 ${isEmbedded ? "pt-2 pb-1.5 space-y-1.5 sm:pt-4 sm:pb-2 sm:space-y-2" : "pt-3 pb-2 space-y-2 sm:pt-6 sm:pb-2 sm:space-y-2.5"}`}>
    <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-label text-accent">
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      System Operational
    </div>
    
    <h1 className="max-w-xl text-lg font-bold tracking-tight leading-tight text-foreground sm:text-xl md:text-2xl balance">
      Product development guidance, retrieval, and tools in one conversation.
    </h1>
  </div>
);

function extractInlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
        case "bold":
        case "code-inline":
          return node.text;
        case "library-link":
          return node.slug.replace(/-/g, " ");
        default:
          return "";
      }
    })
    .join(" ");
}

function extractBlockText(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "blockquote":
      return extractInlineText(block.content);
    case "list":
      return block.items.map((item) => extractInlineText(item)).join(" ");
    case "table":
      return [
        ...(block.header ?? []).map((cell) => extractInlineText(cell)),
        ...block.rows.flat().map((cell) => extractInlineText(cell)),
      ].join(" ");
    case "audio":
      return `${block.title} ${block.text}`;
    case "web-search":
      return `${block.query} ${(block.allowed_domains ?? []).join(" ")}`;
    case "code-block":
      return block.code;
    case "divider":
      return "";
    default:
      return "";
  }
}

function extractRichContentText(content: RichContent): string {
  return content.blocks.map((block) => extractBlockText(block)).join(" ").trim();
}

export const MessageList: React.FC<MessageListProps> = React.memo(({
  messages,
  isSending,
  dynamicSuggestions,
  onSuggestionClick,
  onLinkClick,
  searchQuery,
  isEmbedded = false,
}) => {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMessages = normalizedQuery
    ? messages.filter((m) =>
        `${m.rawContent} ${extractRichContentText(m.content)}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : messages;

  const firstMessageId = messages[0]?.id;
  const lastMessageId = messages[messages.length - 1]?.id;
  const lastVisibleMessageId = filteredMessages[filteredMessages.length - 1]?.id;
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;
  const hasVisibleSuggestionChips =
    !isSending &&
    dynamicSuggestions.length > 0 &&
    lastAssistantMessageId != null &&
    lastAssistantMessageId === lastVisibleMessageId;

  if (filteredMessages.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
        <p className="text-sm font-medium">
          No messages found matching &ldquo;{searchQuery}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-3xl flex-col`}
      data-message-list-mode={isEmbedded ? "embedded" : "floating"}
      data-chat-fold-buffer={isEmbedded ? "true" : undefined}
      style={{
        gap: "var(--message-gap)",
        paddingBottom: isEmbedded
          ? `calc(var(--chat-fold-gutter) + var(--chat-composer-gap) + ${hasVisibleSuggestionChips ? "var(--chat-suggestion-stack-clearance)" : "0px"})`
          : "2rem",
      }}
    >
      {messages.length === 1 && !searchQuery && <BrandHeader isEmbedded={isEmbedded} />}

      {filteredMessages.map((message) => (
        <div key={message.id} className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out fill-mode-both">
          {message.role === "user" ? (
            <UserBubble content={message} />
          ) : (
            <AssistantBubble
              message={message}
              isStreaming={isSending && message.id === lastMessageId}
              onLinkClick={onLinkClick}
              isInitialGreeting={message.id === firstMessageId}
            />
          )}

          {message.role === "assistant" &&
            !isSending &&
            message.id === lastAssistantMessageId &&
            message.id === lastVisibleMessageId &&
            dynamicSuggestions.length > 0 && (
              <div className="ms-12 mt-3 mb-0 pb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 sm:mt-4 sm:pb-4">
                <SuggestionChips
                  suggestions={dynamicSuggestions}
                  onSend={onSuggestionClick}
                />
              </div>
            )}
        </div>
      ))}

      {isSending && lastVisibleMessageId === lastMessageId && messages[messages.length - 1]?.role === "user" && (
        <TypingIndicator />
      )}
    </div>
  );
});

MessageList.displayName = "MessageList";

const UserBubble = React.memo<{ content: PresentedMessage }>(({ content }) => {
  return (
    <div className="flex w-full flex-col items-end gap-1.5 px-1 sm:px-2 md:px-0">
      <div className="max-w-[92%] rounded-2xl rounded-tr-sm border border-accent/20 bg-accent px-4 py-2.5 text-[13px] leading-relaxed text-accent-foreground shadow-sm sm:max-w-[78%] sm:px-5 sm:py-3 sm:text-sm">
        <ErrorBoundary name="UserBubble">
          <RichContentRenderer content={content.content} />
          {content.attachments.length > 0 && (
            <div className={`${content.rawContent ? "mt-3" : ""} flex flex-col gap-2`}>
              {content.attachments.map((attachment) => (
                <a
                  key={attachment.assetId}
                  href={`/api/user-files/${attachment.assetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-accent-foreground/20 bg-accent-foreground/8 px-3 py-2 text-left transition-colors hover:bg-accent-foreground/14"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold uppercase tracking-[0.12em] opacity-70">
                      Attachment
                    </span>
                    <span className="block truncate text-sm font-medium normal-case tracking-normal opacity-100">
                      {attachment.fileName}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] opacity-75">
                    {Math.max(1, Math.round(attachment.fileSize / 1024))} KB
                  </span>
                </a>
              ))}
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
});

UserBubble.displayName = "UserBubble";

const AssistantBubble = React.memo<{
  message: PresentedMessage;
  isStreaming: boolean;
  onLinkClick: (slug: string) => void;
  isInitialGreeting?: boolean;
}>(({ message, isStreaming, onLinkClick, isInitialGreeting }) => {
  const [displayText, setDisplayText] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(!!isInitialGreeting);
  
  React.useEffect(() => {
    if (!isInitialGreeting) return;
    let current = "";
    let index = 0;
    const speed = 10;
    const fullText = message.rawContent || "";

    const interval = setInterval(() => {
      if (index < fullText.length) {
        current += fullText[index];
        setDisplayText(current);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [message.rawContent, isInitialGreeting]);

  return (
    <div className="group flex w-full items-start justify-start gap-2.5 px-1 transition-all duration-300 sm:gap-4 sm:px-2 md:px-0">
      <div className={`w-8 h-8 mt-1 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isInitialGreeting ? "bg-accent/15 border-accent/30" : "bg-surface-muted border-border"}`}>
        <span className={`text-[10px] font-bold ${isInitialGreeting ? "text-accent" : "text-foreground/60"}`}>A</span>
      </div>

      <div className={`flex w-full max-w-[95%] flex-col gap-1.5 sm:max-w-[90%] ${isInitialGreeting ? "pt-1" : ""}`}>
        <div className="relative rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed text-foreground shadow-sm sm:px-5 sm:text-sm">
          <ErrorBoundary name="AssistantBubble">
            {isInitialGreeting ? (
              <div className="relative">
                <div className="invisible pointer-events-none" aria-hidden="true">
                  <RichContentRenderer content={message.content} />
                </div>
                <div className="absolute inset-x-0 top-0">
                  {isTyping ? (
                    <div className="inline whitespace-pre-wrap">
                      {displayText}
                      <span className="inline-block w-1.5 h-4 ms-1 bg-accent animate-pulse align-middle" />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-500">
                      <RichContentRenderer content={message.content} onLinkClick={onLinkClick} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <RichContentRenderer
                content={message.content}
                onLinkClick={onLinkClick}
              />
            )}
          </ErrorBoundary>

          {isStreaming && !isInitialGreeting && (
            <span className="inline-block w-1 h-3.5 bg-accent animate-pulse align-middle ms-1 rounded-sm relative -top-0.5" />
          )}
        </div>
      </div>
    </div>
  );
});

AssistantBubble.displayName = "AssistantBubble";

const TypingIndicator = () => (
  <div className="flex justify-start gap-2.5 items-center ms-12 mt-2">
    <div className="flex gap-1.5 items-center px-2 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60 animate-bounce [animation-delay:120ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60 animate-bounce [animation-delay:240ms]" />
    </div>
  </div>
);

const SuggestionChips: React.FC<{
  suggestions: string[];
  onSend: (text: string) => void;
}> = ({ suggestions, onSend }) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2.5">
      {suggestions.map((s, i) => (
        <button
          key={s}
          onClick={() => onSend(s)}
          style={{ animationDelay: `${i * 100}ms` }}
          className="rounded-theme border-theme bg-surface hover:bg-accent hover:text-accent-foreground hover:border-accent px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-medium text-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both focus-ring"
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);
