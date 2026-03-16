"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useGlobalChat } from "@/hooks/useGlobalChat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useTheme } from "@/components/ThemeProvider";
import { useMentions } from "@/hooks/useMentions";
import { useMessageScrollBoundaryLock } from "@/hooks/useMessageScrollBoundaryLock";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ConversationSidebar } from "./ConversationSidebar";
import { ChatPresenter } from "../../adapters/ChatPresenter";
import { MarkdownParserService } from "../../adapters/MarkdownParserService";
import { CommandParserService } from "../../adapters/CommandParserService";
import { useUICommands } from "@/hooks/useUICommands";
import { useCommandRegistry } from "@/hooks/useCommandRegistry";
import { supportsReducedMotion, supportsViewTransitions } from "@/lib/ui/browserSupport";
import { commandRegistry } from "../../core/commands/CommandRegistry";

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
  const { messages, input, isSending, canSend, setInput, sendMessage, conversationId, isLoadingMessages } =
    useGlobalChat();
  const {
    accessibility,
    setAccessibility,
    gridEnabled,
    setGridEnabled,
  } = useTheme();

  useCommandRegistry();

  const markdownParser = useMemo(() => new MarkdownParserService(), []);
  const commandParser = useMemo(() => new CommandParserService(), []);
  const presenter = useMemo(
    () => new ChatPresenter(markdownParser, commandParser),
    [markdownParser, commandParser],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isClientReadyForTransitions, setIsClientReadyForTransitions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeTrigger,
    suggestions: mentionSuggestions,
    handleInput: handleMentionInput,
    insertMention,
  } = useMentions(textareaRef);

  // Present messages for the UI
  const presentedMessages = useMemo(() => {
    return messages.map((m, index) =>
      presenter.present({
        id: String(index),
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date(),
        parts: m.parts,
      }),
    );
  }, [messages, presenter]);

  const dynamicSuggestions = useMemo(() => {
    const lastMsg = presentedMessages[presentedMessages.length - 1];
    return lastMsg?.role === "assistant" && lastMsg.suggestions
      ? lastMsg.suggestions
      : [];
  }, [presentedMessages]);

  useUICommands(presentedMessages);

  const { scrollRef, isAtBottom, scrollToBottom, handleScroll } =
    useChatScroll(presentedMessages);

  useMessageScrollBoundaryLock(scrollRef, !isFloating);

  // Handle Input Change
  const handleInputChange = useCallback((val: string, selectionStart: number) => {
    setInput(val);
    handleMentionInput(val, selectionStart);
    setMentionIndex(0);
  }, [setInput, handleMentionInput]);

  const handleSuggestionClick = useCallback(async (txt: string) => {
    await sendMessage(txt);
  }, [sendMessage]);

  const handleLinkClick = useCallback((slug: string) => {
    console.log("Link clicked", slug);
  }, []);

  // Handle Send
  const handleSend = async () => {
    if (!canSend) return;
    await sendMessage();
  };

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
        className="relative flex min-h-0 w-full flex-col overflow-hidden"
        data-chat-message-region={isFloating ? undefined : "true"}
      >
        {/* Nuanced Background Branding */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03] dark:opacity-[0.02]">
          <div className="text-[15rem] sm:text-[22rem] lg:text-[30rem] font-bold leading-none select-none tracking-tighter">O</div>
        </div>
        
        {/* SCROLL AREA: Flex-basis based scroll power */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className={`z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4 ${!isFloating ? "pt-2" : ""}`}
          data-chat-message-viewport={isFloating ? undefined : "true"}
        >
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-32 text-xs opacity-40 animate-pulse">Loading conversation…</div>
          ) : (
          <div
            className={`${isFullScreen ? "max-w-4xl mx-auto w-full" : "w-full"} ${!isFloating ? "min-h-full flex flex-col justify-end" : ""}`}
            data-chat-message-stack={isFloating ? undefined : "true"}
          >
            <MessageList
              messages={presentedMessages}
              isSending={isSending}
              dynamicSuggestions={dynamicSuggestions}
              onSuggestionClick={handleSuggestionClick}
              onLinkClick={handleLinkClick}
              searchQuery={sessionSearchQuery}
              isEmbedded={!isFloating}
            />
          </div>
          )}
        </div>
        {!isAtBottom && (
          <div className="absolute bottom-[max(1rem,var(--safe-area-inset-bottom))] left-0 right-0 z-10 flex justify-center pointer-events-none px-3">
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

      <div
        className={`flex-none border-t border-color-theme bg-background px-3 pt-3 pb-4 sm:px-(--container-padding) sm:pb-5 ${isFloating && isFullScreen ? "safe-area-px safe-area-pb" : ""}`}
        data-chat-composer-row={isFloating ? undefined : "true"}
      >
        <div className={isFullScreen ? "max-w-4xl mx-auto w-full" : "w-full"}>
          <ChatInput
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
            onSuggestionSelect={(item) => {
              if (activeTrigger?.char === "/") {
                const cmd = commandRegistry.getCommand(item.id);
                if (cmd) {
                  cmd.execute();
                  setInput("");
                  return;
                }
              }
              const newText = insertMention(item);
              setInput(newText);
            }}
            pendingFiles={[]}
            onFileSelect={() => {}}
            onFileRemove={() => {}}
          />
        </div>
      </div>
    </section>
  );
};
