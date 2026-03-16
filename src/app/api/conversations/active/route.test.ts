import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { interactor, resolveUserId, embedConversation } = vi.hoisted(() => ({
  interactor: {
    getActiveForUser: vi.fn(),
    archiveActive: vi.fn(),
  },
  resolveUserId: vi.fn(),
  embedConversation: vi.fn(),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getConversationInteractor: () => interactor,
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId,
}));

vi.mock("@/lib/chat/embed-conversation", () => ({
  embedConversation,
}));

import { GET as getActiveConversation } from "./route";
import { POST as archiveActiveConversation } from "./archive/route";

function makeRequest(path: string, method: "GET" | "POST" = "GET") {
  return new NextRequest(new URL(path, "http://localhost:3000"), { method });
}

describe("active conversation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embedConversation.mockResolvedValue(undefined);
  });

  it("restores an anonymous user's active conversation", async () => {
    resolveUserId.mockResolvedValue({ userId: "anon_123", isAnonymous: true });
    interactor.getActiveForUser.mockResolvedValue({
      conversation: { id: "conv_1" },
      messages: [{ id: "msg_1", content: "Hello" }],
    });

    const response = await getActiveConversation(makeRequest("/api/conversations/active"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(resolveUserId).toHaveBeenCalled();
    expect(interactor.getActiveForUser).toHaveBeenCalledWith("anon_123");
    expect(payload.conversation.id).toBe("conv_1");
  });

  it("returns 404 when no active conversation exists for anonymous user", async () => {
    resolveUserId.mockResolvedValue({ userId: "anon_123", isAnonymous: true });
    interactor.getActiveForUser.mockResolvedValue(null);

    const response = await getActiveConversation(makeRequest("/api/conversations/active"));

    expect(response.status).toBe(404);
  });

  it("archives an anonymous active conversation without embedding it", async () => {
    resolveUserId.mockResolvedValue({ userId: "anon_123", isAnonymous: true });
    interactor.archiveActive.mockResolvedValue({ id: "conv_1" });

    const response = await archiveActiveConversation(
      makeRequest("/api/conversations/active/archive", "POST"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(interactor.archiveActive).toHaveBeenCalledWith("anon_123");
    expect(embedConversation).not.toHaveBeenCalled();
    expect(payload.conversationId).toBe("conv_1");
  });

  it("embeds archived authenticated conversations for search", async () => {
    resolveUserId.mockResolvedValue({ userId: "usr_123", isAnonymous: false });
    interactor.archiveActive.mockResolvedValue({ id: "conv_2" });

    const response = await archiveActiveConversation(
      makeRequest("/api/conversations/active/archive", "POST"),
    );

    expect(response.status).toBe(200);
    expect(embedConversation).toHaveBeenCalledWith("conv_2", "usr_123");
  });
});