import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/AppShell";
import Home from "@/app/page";
import type { User } from "@/core/entities/user";

let pathname = "/";

const baseUser: User = {
  id: "usr_1",
  email: "user@example.com",
  name: "Test User",
  roles: ["AUTHENTICATED"],
};

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/components/AccountMenu", () => ({
  AccountMenu: () => <div data-testid="account-menu" />,
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({
    accessibility: { density: "comfortable" },
    setAccessibility: vi.fn(),
    gridEnabled: false,
    setGridEnabled: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGlobalChat", () => ({
  useGlobalChat: () => ({
    messages: [],
    input: "",
    isSending: false,
    canSend: false,
    setInput: vi.fn(),
    sendMessage: vi.fn(),
    conversationId: null,
    isLoadingMessages: false,
  }),
}));

vi.mock("@/hooks/useChatScroll", () => ({
  useChatScroll: () => ({
    scrollRef: { current: null },
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    handleScroll: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMentions", () => ({
  useMentions: () => ({
    activeTrigger: null,
    suggestions: [],
    handleInput: vi.fn(),
    insertMention: vi.fn(() => ""),
  }),
}));

vi.mock("@/hooks/useUICommands", () => ({
  useUICommands: vi.fn(),
}));

vi.mock("@/hooks/useCommandRegistry", () => ({
  useCommandRegistry: vi.fn(),
}));

vi.mock("@/frameworks/ui/ChatHeader", () => ({
  ChatHeader: () => <div data-testid="chat-header" />,
}));

vi.mock("@/frameworks/ui/MessageList", () => ({
  MessageList: ({ isEmbedded }: { isEmbedded?: boolean }) => (
    <div data-embedded={isEmbedded ? "true" : "false"} data-testid="message-list" />
  ),
}));

vi.mock("@/frameworks/ui/ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}));

vi.mock("@/frameworks/ui/ConversationSidebar", () => ({
  ConversationSidebar: () => <div data-testid="conversation-sidebar" />,
}));

describe("homepage shell layout", () => {
  beforeEach(() => {
    pathname = "/";
  });

  function renderHomeShell() {
    return render(
      <AppShell user={baseUser}>
        <Home />
      </AppShell>,
    );
  }

  it("renders a dedicated homepage chat stage inside the home route main region", () => {
    const { container } = renderHomeShell();

    const stage = container.querySelector<HTMLElement>(
      '[data-homepage-chat-stage="true"]',
    );
    expect(stage).not.toBeNull();
    expect(screen.getByRole("main")).toContainElement(stage);
  });

  it("marks the homepage stage as a bounded interaction surface", () => {
    const { container } = renderHomeShell();

    const stage = container.querySelector<HTMLElement>(
      '[data-homepage-chat-stage="true"]',
    );

    expect(stage).toHaveAttribute("data-homepage-stage-behavior", "bounded");
  });

  it("keeps the footer outside the homepage stage", () => {
    const { container } = renderHomeShell();

    const stage = container.querySelector<HTMLElement>(
      '[data-homepage-chat-stage="true"]',
    );
    const footer = screen.getByRole("contentinfo");

    expect(stage).not.toContainElement(footer);
  });

  it("keeps the viewport stage separate from the document scroll owner", () => {
    const { container } = renderHomeShell();

    const shell = container.querySelector<HTMLElement>(
      '[data-shell-scroll-owner="document"]',
    );
    const viewportStage = container.querySelector<HTMLElement>(
      '[data-shell-viewport-stage="true"]',
    );
    const footer = screen.getByRole("contentinfo");

    expect(shell).not.toBeNull();
    expect(viewportStage).not.toBeNull();
    expect(shell).toContainElement(viewportStage);
    expect(shell).toContainElement(footer);
    expect(viewportStage).not.toContainElement(footer);
  });

  it("keeps the embedded workspace inside the viewport stage", () => {
    const { container } = renderHomeShell();

    const viewportStage = container.querySelector<HTMLElement>(
      '[data-shell-viewport-stage="true"]',
    );
    const chatContainer = container.querySelector<HTMLElement>(
      '[data-chat-container-mode="embedded"]',
    );

    expect(viewportStage).toContainElement(chatContainer);
  });

  it("renders embedded chat as a strict message/composer workspace", () => {
    const { container } = renderHomeShell();

    const chatContainer = container.querySelector<HTMLElement>(
      '[data-chat-container-mode="embedded"]',
    );
    const messageViewport = container.querySelector<HTMLElement>(
      '[data-chat-message-viewport="true"]',
    );
    const composerRow = container.querySelector<HTMLElement>(
      '[data-chat-composer-row="true"]',
    );

    expect(chatContainer).not.toBeNull();
    expect(chatContainer).toHaveAttribute("data-chat-layout", "message-composer");
    expect(messageViewport).not.toBeNull();
    expect(composerRow).not.toBeNull();
    expect(screen.getByTestId("message-list")).toHaveAttribute(
      "data-embedded",
      "true",
    );
  });

  it("keeps the composer row outside the message viewport subtree", () => {
    const { container } = renderHomeShell();

    const messageViewport = container.querySelector<HTMLElement>(
      '[data-chat-message-viewport="true"]',
    );
    const composerRow = container.querySelector<HTMLElement>(
      '[data-chat-composer-row="true"]',
    );
    const messageList = screen.getByTestId("message-list");

    expect(messageViewport).toContainElement(messageList);
    expect(messageViewport).not.toContainElement(composerRow);
  });

  it("keeps reduced-height pressure on the message viewport instead of the composer row", () => {
    const { container } = renderHomeShell();

    const stage = container.querySelector<HTMLElement>(
      '[data-homepage-chat-stage="true"]',
    );
    const messageRegion = container.querySelector<HTMLElement>(
      '[data-chat-message-region="true"]',
    );
    const messageViewport = container.querySelector<HTMLElement>(
      '[data-chat-message-viewport="true"]',
    );
    const composerRow = container.querySelector<HTMLElement>(
      '[data-chat-composer-row="true"]',
    );

    expect(stage?.className).toContain("overflow-hidden");
    expect(messageRegion?.className).toContain("flex");
    expect(messageRegion?.className).toContain("overflow-hidden");
    expect(messageViewport?.className).toContain("min-h-0");
    expect(messageViewport?.className).toContain("flex-1");
    expect(messageViewport?.className).toContain("overflow-y-auto");
    expect(composerRow?.className).toContain("flex-none");
  });
});