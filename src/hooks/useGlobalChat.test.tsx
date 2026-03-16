import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/adapters/StreamProviderFactory", () => ({
  getChatStreamProvider: () => ({
    fetchStream: vi.fn(),
  }),
}));

import { ChatProvider, useGlobalChat } from "./useGlobalChat";

function ChatProbe() {
  const chat = useGlobalChat();

  return (
    <div>
      <div data-testid="message-count">{chat.messages.length}</div>
      <div data-testid="first-message">{chat.messages[0]?.content ?? ""}</div>
      <div data-testid="conversation-id">{chat.conversationId ?? "none"}</div>
      <div data-testid="loading-state">{String(chat.isLoadingMessages)}</div>
    </div>
  );
}

function renderChatProvider() {
  return render(
    <ChatProvider>
      <ChatProbe />
    </ChatProvider>,
  );
}

describe("ChatProvider active conversation restore", () => {
  const fetchMock = vi.fn();
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("hydrates messages and conversation id when an active conversation exists", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        conversation: { id: "conv_active" },
        messages: [
          {
            id: "msg_1",
            role: "user",
            content: "Restored question",
            parts: [{ type: "text", text: "Restored question" }],
            createdAt: "2026-03-15T10:00:00.000Z",
          },
          {
            id: "msg_2",
            role: "assistant",
            content: "Restored answer",
            parts: [{ type: "text", text: "Restored answer" }],
            createdAt: "2026-03-15T10:00:01.000Z",
          },
        ],
      }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/conversations/active");
    expect(screen.getByTestId("message-count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-message")).toHaveTextContent("Restored question");
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_active");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps the hero state when no active conversation exists", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "No active conversation" }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-message").textContent).toBeTruthy();
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("warns and keeps the hero state when restore unexpectedly returns 401", async () => {
    fetchMock.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: "Authentication required" }),
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-message").textContent).toBeTruthy();
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
    expect(warnSpy).toHaveBeenCalledWith(
      "Active conversation restore unexpectedly required authentication.",
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps the hero state on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-message").textContent).toBeTruthy();
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});