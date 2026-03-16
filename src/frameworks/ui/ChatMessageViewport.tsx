import React from "react";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useMessageScrollBoundaryLock } from "@/hooks/useMessageScrollBoundaryLock";

import { MessageList } from "./MessageList";

interface ChatMessageViewportProps {
  dynamicSuggestions: string[];
  isEmbedded: boolean;
  isFullScreen: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  messages: PresentedMessage[];
  onLinkClick: (slug: string) => void;
  onSuggestionClick: (text: string) => void;
  scrollDependency: string;
  searchQuery: string;
  showEmbeddedStageBranding: boolean;
}

export const ChatMessageViewport: React.FC<ChatMessageViewportProps> = ({
  dynamicSuggestions,
  isEmbedded,
  isFullScreen,
  isLoadingMessages,
  isSending,
  messages,
  onLinkClick,
  onSuggestionClick,
  scrollDependency,
  searchQuery,
  showEmbeddedStageBranding,
}) => {
  const { scrollRef, isAtBottom, scrollToBottom, handleScroll } =
    useChatScroll(scrollDependency);

  useMessageScrollBoundaryLock(scrollRef, isEmbedded);

  return (
    <div
      className="relative flex min-h-0 w-full flex-col overflow-hidden"
      data-chat-message-region={isEmbedded ? "true" : undefined}
    >
      {showEmbeddedStageBranding && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.02] pointer-events-none select-none">
          <div className="text-[10rem] font-bold leading-none tracking-tighter select-none sm:text-[14rem] lg:text-[18rem]">O</div>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4 ${isEmbedded ? "pt-2 pb-2 sm:pb-3" : ""}`}
        data-chat-message-viewport={isEmbedded ? "true" : undefined}
      >
        {isLoadingMessages ? (
          <div className="flex h-32 items-center justify-center text-xs opacity-40 animate-pulse">
            Loading conversation…
          </div>
        ) : (
          <div
            className={`${isFullScreen ? "mx-auto w-full max-w-4xl" : "w-full"} ${isEmbedded ? "flex min-h-full flex-col justify-end" : ""}`}
            data-chat-message-stack={isEmbedded ? "true" : undefined}
          >
            <MessageList
              messages={messages}
              isSending={isSending}
              dynamicSuggestions={dynamicSuggestions}
              onSuggestionClick={onSuggestionClick}
              onLinkClick={onLinkClick}
              searchQuery={searchQuery}
              isEmbedded={isEmbedded}
            />
          </div>
        )}
      </div>

      {!isAtBottom && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center px-3 pointer-events-none"
          style={{
            bottom: isEmbedded
              ? "calc(var(--chat-scroll-cta-offset) + var(--safe-area-inset-bottom))"
              : "max(1rem, var(--safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={() => scrollToBottom()}
            className="pointer-events-auto focus-ring min-h-11 rounded-full accent-fill px-4 py-2 text-[11px] font-bold shadow-xl transition-all hover:scale-105"
            aria-label="Scroll to bottom"
          >
            ↓ Scroll to bottom
          </button>
        </div>
      )}
    </div>
  );
};