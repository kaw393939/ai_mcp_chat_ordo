import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchStreamMock } = vi.hoisted(() => ({
  fetchStreamMock: vi.fn(),
}));

vi.mock("@/adapters/StreamProviderFactory", () => ({
  getChatStreamProvider: () => ({
    fetchStream: fetchStreamMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({
    accessibility: { density: "comfortable" },
    setAccessibility: vi.fn(),
    gridEnabled: false,
    setGridEnabled: vi.fn(),
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

import { ChatProvider } from "@/hooks/useGlobalChat";
import { ChatContainer } from "@/frameworks/ui/ChatContainer";

describe("ChatContainer send failure regression", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchStreamMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);

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
  });

  it("preserves the draft and pending files when upload succeeds but streaming fails", async () => {
    const { container } = render(
      <ChatProvider>
        <ChatContainer isFloating={false} />
      </ChatProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/conversations/active");
    });

    const textarea = screen.getByPlaceholderText("Ask anything…") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Draft with attachment", selectionStart: 21 },
    });

    const fileInput = container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected file input to be rendered.");
    }

    const file = new File(["brief"], "brief.txt", { type: "text/plain" });
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    expect(
      screen.getByRole("button", { name: "Remove brief.txt" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

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

    expect(textarea.value).toBe("Draft with attachment");
    expect(
      screen.getByRole("button", { name: "Remove brief.txt" }),
    ).toBeInTheDocument();
  });
});