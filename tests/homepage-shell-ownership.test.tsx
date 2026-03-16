import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/AppShell";
import { ChatContainer } from "@/frameworks/ui/ChatContainer";
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
  useRouter: () => ({ push: vi.fn() }),
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
    isSending: false,
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
  useCommandRegistry: vi.fn(() => ({
    executeCommand: vi.fn(() => false),
    findCommands: vi.fn(() => []),
  })),
}));

vi.mock("@/frameworks/ui/ChatHeader", () => ({
  ChatHeader: () => <div data-testid="chat-header" />,
}));

vi.mock("@/frameworks/ui/MessageList", () => ({
  MessageList: () => <div data-testid="message-list" />,
}));

vi.mock("@/frameworks/ui/ChatInput", () => ({
  ChatInput: () => <div data-testid="chat-input" />,
}));

vi.mock("@/frameworks/ui/ConversationSidebar", () => ({
  ConversationSidebar: () => <div data-testid="conversation-sidebar" />,
}));

describe("homepage shell ownership", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("renders the real footer on the home route while keeping the home stage marker", () => {
    const { container } = render(
      <AppShell user={baseUser}>
        <div>Homepage Stage</div>
      </AppShell>,
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("data-home-chat-route", "true");
    expect(
      container.querySelector('[data-shell-scroll-owner="document"]'),
    ).not.toBeNull();
  });

  it("keeps the real footer on non-home routes too", () => {
    pathname = "/dashboard";

    render(
      <AppShell user={baseUser}>
        <div>Dashboard</div>
      </AppShell>,
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toHaveAttribute(
      "data-home-chat-route",
    );
  });

  it("keeps the footer outside the viewport stage at the shell level", () => {
    const { container } = render(
      <AppShell user={baseUser}>
        <div>Homepage Stage</div>
      </AppShell>,
    );

    const viewportStage = container.querySelector<HTMLElement>(
      '[data-shell-viewport-stage="true"]',
    );
    const footer = screen.getByRole("contentinfo");

    expect(viewportStage).not.toBeNull();
    expect(viewportStage).not.toContainElement(footer);
  });

  it("renders the sparse homepage nav contract", () => {
    render(
      <AppShell user={baseUser}>
        <div>Homepage Stage</div>
      </AppShell>,
    );

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav).getByRole("link", { name: /studio ordo/i }),
    ).toBeInTheDocument();
    expect(within(nav).getByTestId("account-menu")).toBeInTheDocument();
    expect(within(nav).queryByText(/site links/i)).not.toBeInTheDocument();
  });

  it("does not render a footer substitute inside the embedded chat container", () => {
    render(<ChatContainer isFloating={false} />);

    expect(
      screen.queryByRole("button", { name: /open site links/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/site links/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});