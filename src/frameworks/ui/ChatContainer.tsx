"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGlobalChat } from "@/hooks/useGlobalChat";
import { useTheme } from "@/components/ThemeProvider";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageViewport } from "./ChatMessageViewport";
import { ChatInput } from "./ChatInput";
import { ConversationSidebar } from "./ConversationSidebar";
import { useUICommands } from "@/hooks/useUICommands";
import { usePresentedChatMessages } from "@/hooks/usePresentedChatMessages";
import { useChatComposerController } from "@/hooks/chat/useChatComposerController";
import { supportsReducedMotion, supportsViewTransitions } from "@/lib/ui/browserSupport";

interface Props {
  isFloating?: boolean;
  onClose?: () => void;
}

const EMBEDDED_CONTAINER_CLASSES =
  "relative grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] bg-background";

export const ChatContainer: React.FC<Props> = ({
  isFloating = false,
  onClose: _onClose,
}) => {
  const router = useRouter();
  const { messages, isSending, sendMessage, conversationId, isLoadingMessages } =
    useGlobalChat();
  const {
    accessibility,
    setAccessibility,
    gridEnabled,
    setGridEnabled,
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [isClientReadyForTransitions, setIsClientReadyForTransitions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    activeTrigger,
    canSend,
    handleFileRemove,
    handleFileSelect,
    handleInputChange,
    handleSend,
    handleSuggestionSelect,
    input,
    mentionIndex,
    pendingFiles,
    setMentionIndex,
    suggestions: mentionSuggestions,
  } = useChatComposerController({
    isSending,
    onSendMessage: sendMessage,
    textareaRef,
  });

  const {
    presentedMessages,
    dynamicSuggestions,
    scrollDependency,
  } = usePresentedChatMessages(messages);

  useUICommands(presentedMessages);

  const handleSuggestionClick = useCallback(async (txt: string) => {
    await sendMessage(txt);
  }, [sendMessage]);

  const handleLinkClick = useCallback((slug: string) => {
    router.push(`/book/${slug}`);
  }, [router]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsClientReadyForTransitions(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const canUseViewTransitions = useMemo(
    () => isClientReadyForTransitions && supportsViewTransitions() && !supportsReducedMotion(),
    [isClientReadyForTransitions],
  );

  const showEmbeddedStageBranding = !isFloating && !sessionSearchQuery && presentedMessages.length <= 1;

  if (isFloating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 inset-e-6 z-60 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full accent-fill shadow-[-20px_20px_60px_rgba(0,0,0,0.4)] transition-all duration-300 group hover:scale-110 active:scale-95 focus-ring"
        style={{
          insetBlockEnd: "max(1.5rem, var(--safe-area-inset-bottom))",
          insetInlineEnd: "max(1.5rem, var(--safe-area-inset-right))",
        }}
        aria-label="Ask PD Advisor"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  const containerClasses = isFloating
    ? `glass-surface fixed z-60 flex flex-col overflow-hidden border-theme shadow-[-40px_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isFullScreen ? "inset-0 rounded-none" : "rounded-[32px]"}`
    : EMBEDDED_CONTAINER_CLASSES;

  const sectionStyle: React.CSSProperties = {};

  if (canUseViewTransitions) {
    sectionStyle.viewTransitionName = "chat-container";
  }

  if (isFloating) {
    if (isFullScreen) {
      sectionStyle.blockSize = "var(--viewport-block-size)";
    } else {
      sectionStyle.insetBlockEnd = "max(1.5rem, var(--safe-area-inset-bottom))";
      sectionStyle.insetInlineEnd = "max(1.5rem, var(--safe-area-inset-right))";
      sectionStyle.inlineSize = "min(30rem, calc(100vw - max(1.5rem, var(--safe-area-inset-left)) - max(1.5rem, var(--safe-area-inset-right))))";
      sectionStyle.blockSize = "min(820px, calc(var(--viewport-block-size) - max(1.5rem, var(--safe-area-inset-top)) - max(1.5rem, var(--safe-area-inset-bottom)) - 3rem))";
    }
  }

  return (
    <section
      className={containerClasses}
      style={sectionStyle}
      data-chat-container-mode={isFloating ? "floating" : "embedded"}
      data-chat-layout={isFloating ? undefined : "message-composer"}
    >
      {isFloating && (
        <ChatHeader
          title="PD Advisor"
          subtitle="Intelligent Orchestrator"
          isFloating={isFloating}
          onMinimize={() => {
              setIsOpen(false);
              setIsFullScreen(false);
          }}
          onFullScreenToggle={() => setIsFullScreen(!isFullScreen)}
          isFullScreen={isFullScreen}
          searchQuery={sessionSearchQuery}
          onSearchChange={setSessionSearchQuery}
          density={accessibility.density}
          onDensityChange={(d) =>
            setAccessibility({ ...accessibility, density: d })
          }
          gridEnabled={gridEnabled}
          onGridToggle={() => setGridEnabled(!gridEnabled)}
        />
      )}

      {/* New conversation action — only show when there's an active conversation */}
      {isFloating && conversationId && (
        <div className="border-b border-color-theme">
              <ConversationSidebar />
        </div>
      )}

      <div
        className="contents"
      >
        <ChatMessageViewport
          dynamicSuggestions={dynamicSuggestions}
          isEmbedded={!isFloating}
          isFullScreen={isFullScreen}
          isLoadingMessages={isLoadingMessages}
          isSending={isSending}
          messages={presentedMessages}
          onLinkClick={handleLinkClick}
          onSuggestionClick={handleSuggestionClick}
          scrollDependency={scrollDependency}
          searchQuery={sessionSearchQuery}
          showEmbeddedStageBranding={showEmbeddedStageBranding}
        />
      </div>

      <div
        className={`flex-none border-t border-color-theme bg-background/95 px-3 pb-4 shadow-[0_-18px_40px_-34px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:px-(--container-padding) sm:pb-5 ${isFloating && isFullScreen ? "safe-area-px safe-area-pb" : ""}`}
        data-chat-composer-row={isFloating ? undefined : "true"}
        style={{
          paddingTop: isFloating ? "0.75rem" : "var(--chat-composer-gap)",
        }}
      >
        <div className={isFullScreen ? "max-w-4xl mx-auto w-full" : "w-full"}>
          <ChatInput
            inputRef={textareaRef}
            value={input}
            onChange={handleInputChange}
            onSend={handleSend}
            isSending={isSending}
            canSend={canSend}
            onArrowUp={() => {}}
            activeTrigger={activeTrigger ? activeTrigger.char : null}
            suggestions={mentionSuggestions}
            mentionIndex={mentionIndex}
            onMentionIndexChange={setMentionIndex}
            onSuggestionSelect={handleSuggestionSelect}
            pendingFiles={pendingFiles}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
          />
        </div>
      </div>
    </section>
  );
};
