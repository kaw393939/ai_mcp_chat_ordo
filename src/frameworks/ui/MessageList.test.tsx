import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PresentedMessage } from "@/adapters/ChatPresenter";
import { MessageList } from "@/frameworks/ui/MessageList";

vi.mock("@/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeMessage(overrides: Partial<PresentedMessage>): PresentedMessage {
  return {
    id: overrides.id ?? "msg-1",
    role: overrides.role ?? "assistant",
    rawContent: overrides.rawContent ?? "",
    content: overrides.content ?? {
      blocks: [
        {
          type: "paragraph",
          content: [{ type: "text", text: overrides.rawContent ?? "" }],
        },
      ],
    },
    commands: overrides.commands ?? [],
    suggestions: overrides.suggestions ?? [],
    attachments: overrides.attachments ?? [],
    timestamp: overrides.timestamp ?? "12:00",
  };
}

describe("MessageList", () => {
  it("does not render latest assistant chips when filtering hides the true latest message", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Alpha strategy" }),
      makeMessage({ id: "user-1", role: "user", rawContent: "Tell me more" }),
      makeMessage({ id: "assistant-2", role: "assistant", rawContent: "Beta delivery plan" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Explore next sprint"]}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery="alpha"
        isEmbedded
      />,
    );

    expect(screen.queryByRole("button", { name: "Explore next sprint" })).not.toBeInTheDocument();
  });

  it("matches search queries against rendered message text", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Architecture guidance" }),
      makeMessage({ id: "assistant-2", role: "assistant", rawContent: "Delivery planning" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery="delivery"
        isEmbedded
      />,
    );

    expect(screen.getByText("Delivery planning")).toBeInTheDocument();
    expect(screen.queryByText("Architecture guidance")).not.toBeInTheDocument();
  });

  it("adds an embedded fold gutter so the latest message and chips rest above the fold", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={["Explore next sprint"]}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    const list = screen.getByText("Ready with next steps").closest("[data-message-list-mode]");
    expect(list).toHaveAttribute("data-chat-fold-buffer", "true");
    expect(list).toHaveStyle({
      paddingBottom:
        "calc(var(--chat-fold-gutter) + var(--chat-composer-gap) + var(--chat-suggestion-stack-clearance))",
    });
  });

  it("does not reserve extra chip clearance when no suggestion chips are visible", () => {
    const messages = [
      makeMessage({ id: "assistant-1", role: "assistant", rawContent: "Ready with next steps" }),
    ];

    render(
      <MessageList
        messages={messages}
        isSending={false}
        dynamicSuggestions={[]}
        onSuggestionClick={vi.fn()}
        onLinkClick={vi.fn()}
        searchQuery=""
        isEmbedded
      />,
    );

    const list = screen.getByText("Ready with next steps").closest("[data-message-list-mode]");
    expect(list).toHaveStyle({
      paddingBottom: "calc(var(--chat-fold-gutter) + var(--chat-composer-gap) + 0px)",
    });
  });
});