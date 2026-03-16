import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/frameworks/ui/ChatInput";

describe("ChatInput", () => {
  it("submits on Enter without Shift", () => {
    const onSend = vi.fn();

    render(
      <ChatInput
        value="Draft a response"
        onChange={vi.fn()}
        onSend={onSend}
        isSending={false}
        canSend={true}
        onArrowUp={vi.fn()}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Ask anything…"), {
      key: "Enter",
    });

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("does not submit on Shift+Enter", () => {
    const onSend = vi.fn();

    render(
      <ChatInput
        value="Line one"
        onChange={vi.fn()}
        onSend={onSend}
        isSending={false}
        canSend={true}
        onArrowUp={vi.fn()}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByPlaceholderText("Ask anything…"), {
      key: "Enter",
      shiftKey: true,
    });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("renders a textarea composer", () => {
    render(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isSending={false}
        canSend={false}
        onArrowUp={vi.fn()}
        activeTrigger={null}
        suggestions={[]}
        mentionIndex={0}
        onMentionIndexChange={vi.fn()}
        onSuggestionSelect={vi.fn()}
        pendingFiles={[]}
        onFileSelect={vi.fn()}
        onFileRemove={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Ask anything…").tagName).toBe("TEXTAREA");
  });
});