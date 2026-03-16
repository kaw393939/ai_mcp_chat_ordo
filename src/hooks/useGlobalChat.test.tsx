import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchStreamMock } = vi.hoisted(() => ({
  fetchStreamMock: vi.fn(),
}));

vi.mock("@/adapters/StreamProviderFactory", () => ({
  getChatStreamProvider: () => ({
    fetchStream: fetchStreamMock,
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
      <button type="button" onClick={() => void chat.sendMessage("Send this") }>
        send
      </button>
      <button
        type="button"
        onClick={() =>
          void chat.sendMessage("", [
            new File(["brief"], "brief.txt", { type: "text/plain" }),
          ])
        }
      >
        send-attachment
      </button>
      <button type="button" onClick={() => void chat.archiveConversation()}>
        archive
      </button>
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
    fetchStreamMock.mockReset();
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

  it("archives the active conversation and resets to the hero state", async () => {
    fetchMock
      .mockResolvedValueOnce({
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
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_active");
    });

    screen.getByRole("button", { name: "archive" }).click();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/conversations/active/archive",
        { method: "POST" },
      );
    });

    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(screen.getByTestId("conversation-id")).toHaveTextContent("none");
  });

  it("streams an assistant reply through the public sendMessage API", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "No active conversation" }),
    });
    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "conversation_id", id: "conv_new" };
        yield { type: "text", delta: "Assistant reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send" }));

    await waitFor(() => {
      expect(fetchStreamMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: "assistant" }),
          expect.objectContaining({ role: "user", content: "Send this" }),
        ]),
        { conversationId: undefined, attachments: [] },
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("conversation-id")).toHaveTextContent("conv_new");
      expect(screen.getByTestId("message-count")).toHaveTextContent("3");
    });
  });

  it("uploads attachments before streaming the message", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          attachments: [
            {
              assetId: "uf_attachment",
              fileName: "brief.txt",
              mimeType: "text/plain",
              fileSize: 5,
            },
          ],
        }),
      });

    fetchStreamMock.mockResolvedValue({
      events: async function* () {
        yield { type: "conversation_id", id: "conv_upload" };
        yield { type: "text", delta: "Uploaded reply" };
      },
    });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-attachment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(fetchStreamMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: "",
          }),
        ]),
        {
          conversationId: undefined,
          attachments: [
            {
              type: "attachment",
              assetId: "uf_attachment",
              fileName: "brief.txt",
              mimeType: "text/plain",
              fileSize: 5,
            },
          ],
        },
      );
    });
  });

  it("does not start streaming when attachment upload fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Upload failed" }),
      });

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-attachment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/chat/uploads",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(fetchStreamMock).not.toHaveBeenCalled();
  });

  it("requests attachment cleanup when streaming fails after upload", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: "No active conversation" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          attachments: [
            {
              assetId: "uf_attachment",
              fileName: "brief.txt",
              mimeType: "text/plain",
              fileSize: 5,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deletedIds: ["uf_attachment"] }),
      });

    fetchStreamMock.mockRejectedValue(new Error("stream down"));

    renderChatProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByRole("button", { name: "send-attachment" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "/api/chat/uploads",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ attachmentIds: ["uf_attachment"] }),
        }),
      );
    });
  });
});