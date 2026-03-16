import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatContainer } from "@/frameworks/ui/ChatContainer";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
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
    messages: [
      {
        id: "user-1",
        role: "user",
        content: "Show me the reference",
        timestamp: new Date("2026-03-15T10:00:00.000Z"),
        parts: [],
      },
      {
        id: "assistant-1",
        role: "assistant",
        content: "See [[audit-to-sprint]] for the workflow.",
        timestamp: new Date("2026-03-15T10:00:01.000Z"),
        parts: [],
      },
    ],
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
  useCommandRegistry: () => ({
    executeCommand: vi.fn(() => false),
    findCommands: vi.fn(() => []),
  }),
}));

describe("ChatContainer", () => {
  it("routes inline message links through the legacy chapter resolver", () => {
    render(<ChatContainer isFloating={false} />);

    fireEvent.click(screen.getByRole("button", { name: "audit to sprint" }));

    expect(pushMock).toHaveBeenCalledWith("/book/audit-to-sprint");
  });
});