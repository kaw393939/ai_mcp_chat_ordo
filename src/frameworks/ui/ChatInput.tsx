import React, { useRef } from "react";
import MentionsMenu from "@/components/MentionsMenu";
import type { MentionItem } from "@/core/entities/mentions";

interface ChatInputProps {
  value: string;
  onChange: (val: string, selectionStart: number) => void;
  onSend: () => void;
  isSending: boolean;
  canSend: boolean;
  onArrowUp: () => void;

  // Mentions
  activeTrigger: string | null;
  suggestions: MentionItem[];
  mentionIndex: number;
  onMentionIndexChange: (index: number) => void;
  onSuggestionSelect: (item: MentionItem) => void;

  // Files
  pendingFiles: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  isSending,
  canSend,
  onArrowUp,
  activeTrigger,
  suggestions,
  mentionIndex,
  onMentionIndexChange,
  onSuggestionSelect,
  pendingFiles,
  onFileSelect,
  onFileRemove,
}) => {
  const textareaRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMentionsNavigation = (e: React.KeyboardEvent): boolean => {
    if (!activeTrigger || suggestions.length === 0) return false;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      onMentionIndexChange((mentionIndex + 1) % suggestions.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMentionIndexChange(
        (mentionIndex - 1 + suggestions.length) % suggestions.length,
      );
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const item = suggestions[mentionIndex];
      if (item) onSuggestionSelect(item);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onChange(value, 0);
      return true;
    }
    return false;
  };

  const handleMessageSubmit = (e: React.KeyboardEvent): boolean => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
      return true;
    }
    return false;
  };

  const handleEditLastMessage = (e: React.KeyboardEvent): boolean => {
    if (e.key === "ArrowUp" && value === "" && !isSending) {
      e.preventDefault();
      onArrowUp();
      return true;
    }
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (handleMentionsNavigation(e)) return;
    if (handleMessageSubmit(e)) return;
    handleEditLastMessage(e);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* File Previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border-theme rounded-lg text-xs font-medium"
            >
              <span className="max-w-30 truncate">{file.name}</span>
              <button
                onClick={() => onFileRemove(i)}
                className="hover:text-red-500 p-0.5"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="relative flex items-center gap-2 bg-surface border-theme rounded-[28px] transition-all duration-500 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 shadow-sm hover:shadow-md"
        style={{ padding: 'var(--input-padding)' }}
      >
        {activeTrigger && suggestions.length > 0 && (
          <MentionsMenu
            suggestions={suggestions}
            activeIndex={mentionIndex}
            onSelect={onSuggestionSelect}
          />
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          multiple
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="focus-ring min-h-11 min-w-11 shrink-0 rounded-full p-2 text-foreground/70 transition-all hover:text-accent hover-surface active:scale-95"
          aria-label="Attach file"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          ref={textareaRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? 0)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13px] leading-tight outline-none placeholder:text-foreground/50 font-normal text-foreground sm:px-3 sm:text-sm"
        />

        <button
          type="submit"
          disabled={!canSend && pendingFiles.length === 0}
          className="focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-full accent-fill px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-95 disabled:bg-surface-muted disabled:text-foreground/40 disabled:shadow-none sm:px-5"
        >
          {isSending ? (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
            </span>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
};
