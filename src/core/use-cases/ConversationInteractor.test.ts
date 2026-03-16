import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationInteractor, NotFoundError, MessageLimitError } from "./ConversationInteractor";
import type { ConversationRepository } from "./ConversationRepository";
import type { MessageRepository } from "./MessageRepository";
import type { Conversation, ConversationSummary, Message, NewMessage } from "../entities/conversation";

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv_1",
    userId: "usr_1",
    title: "",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    convertedFrom: null,
    messageCount: 0,
    firstMessageAt: null,
    lastToolUsed: null,
    sessionSource: "authenticated",
    promptVersion: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg_1",
    conversationId: "conv_1",
    role: "user",
    content: "Hello",
    parts: [{ type: "text", text: "Hello" }],
    createdAt: "2024-01-01T00:00:00.000Z",
    tokenEstimate: 2,
    ...overrides,
  };
}

function createMockRepos() {
  const convRepo: ConversationRepository = {
    create: vi.fn().mockResolvedValue(makeConversation()),
    listByUser: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findActiveByUser: vi.fn().mockResolvedValue(null),
    archiveByUser: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    updateTitle: vi.fn().mockResolvedValue(undefined),
    touch: vi.fn().mockResolvedValue(undefined),
    incrementMessageCount: vi.fn().mockResolvedValue(undefined),
    setFirstMessageAt: vi.fn().mockResolvedValue(undefined),
    setLastToolUsed: vi.fn().mockResolvedValue(undefined),
    setConvertedFrom: vi.fn().mockResolvedValue(undefined),
    transferOwnership: vi.fn().mockResolvedValue([]),
  };
  const msgRepo: MessageRepository = {
    create: vi.fn().mockResolvedValue(makeMessage()),
    listByConversation: vi.fn().mockResolvedValue([]),
    countByConversation: vi.fn().mockResolvedValue(0),
  };
  return { convRepo, msgRepo };
}

describe("ConversationInteractor", () => {
  let interactor: ConversationInteractor;
  let convRepo: ConversationRepository;
  let msgRepo: MessageRepository;

  beforeEach(() => {
    const mocks = createMockRepos();
    convRepo = mocks.convRepo;
    msgRepo = mocks.msgRepo;
    interactor = new ConversationInteractor(convRepo, msgRepo);
  });

  describe("create", () => {
    it("creates a new conversation with generated id", async () => {
      await interactor.create("usr_1", "My Chat");
      expect(convRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "usr_1", title: "My Chat" }),
      );
      expect((convRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0].id).toMatch(/^conv_/);
    });

    it("archives existing active conversation before creating new", async () => {
      await interactor.create("usr_1");
      expect(convRepo.archiveByUser).toHaveBeenCalledWith("usr_1");
      expect(convRepo.create).toHaveBeenCalled();
    });
  });

  describe("get — ownership enforcement (NEG-SEC-6)", () => {
    it("returns conversation + messages for owner", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );
      (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([makeMessage()]);

      const result = await interactor.get("conv_1", "usr_1");
      expect(result.conversation.id).toBe("conv_1");
      expect(result.messages.length).toBe(1);
    });

    it("throws NotFoundError for wrong user (not 403)", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await expect(interactor.get("conv_1", "usr_other")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for nonexistent conversation", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(interactor.get("conv_999", "usr_1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("delete — ownership enforcement", () => {
    it("deletes owned conversation", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await interactor.delete("conv_1", "usr_1");
      expect(convRepo.delete).toHaveBeenCalledWith("conv_1");
    });

    it("throws NotFoundError for wrong user", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1" }),
      );

      await expect(interactor.delete("conv_1", "usr_other")).rejects.toThrow(NotFoundError);
    });
  });

  describe("appendMessage", () => {
    beforeEach(() => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", title: "" }),
      );
    });

    it("appends message and calls touch + incrementMessageCount", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(msgRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
      }));
      expect(convRepo.touch).toHaveBeenCalledWith("conv_1");
      expect(convRepo.incrementMessageCount).toHaveBeenCalledWith("conv_1");
    });

    it("auto-titles from first user message when title is empty", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "What is the meaning of life?",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).toHaveBeenCalledWith("conv_1", "What is the meaning of life?");
    });

    it("truncates auto-title to 80 chars", async () => {
      const longContent = "A".repeat(120);
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: longContent,
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).toHaveBeenCalledWith("conv_1", "A".repeat(80));
    });

    it("does NOT auto-title for assistant messages", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "assistant",
        content: "I'm an AI",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).not.toHaveBeenCalled();
    });

    it("does NOT auto-title when title already set", async () => {
      (convRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeConversation({ id: "conv_1", userId: "usr_1", title: "Existing" }),
      );

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await interactor.appendMessage(newMsg, "usr_1");
      expect(convRepo.updateTitle).not.toHaveBeenCalled();
    });

    it("throws MessageLimitError at 200 messages", async () => {
      (msgRepo.countByConversation as ReturnType<typeof vi.fn>).mockResolvedValue(200);

      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Over limit",
        parts: [],
      };

      await expect(interactor.appendMessage(newMsg, "usr_1")).rejects.toThrow(MessageLimitError);
      expect(msgRepo.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundError for wrong user on appendMessage", async () => {
      const newMsg: NewMessage = {
        conversationId: "conv_1",
        role: "user",
        content: "Hello",
        parts: [],
      };

      await expect(interactor.appendMessage(newMsg, "usr_other")).rejects.toThrow(NotFoundError);
    });
  });

  describe("list", () => {
    it("delegates to convRepo.listByUser", async () => {
      const summaries: ConversationSummary[] = [
        { id: "conv_1", title: "Chat 1", updatedAt: "2024-01-01", messageCount: 5 },
      ];
      (convRepo.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue(summaries);

      const result = await interactor.list("usr_1");
      expect(result).toEqual(summaries);
      expect(convRepo.listByUser).toHaveBeenCalledWith("usr_1");
    });
  });

  describe("getActiveForUser", () => {
    it("returns conversation + messages when active exists", async () => {
      const conv = makeConversation({ id: "conv_active", userId: "usr_1" });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(conv);
      (msgRepo.listByConversation as ReturnType<typeof vi.fn>).mockResolvedValue([makeMessage()]);

      const result = await interactor.getActiveForUser("usr_1");
      expect(result).not.toBeNull();
      if (!result) {
        throw new Error("Expected active conversation result");
      }
      expect(result.conversation.id).toBe("conv_active");
      expect(result.messages.length).toBe(1);
    });

    it("returns null when no active conversation", async () => {
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await interactor.getActiveForUser("usr_1");
      expect(result).toBeNull();
    });
  });

  describe("archiveActive", () => {
    it("archives and returns the active conversation", async () => {
      const conv = makeConversation({ id: "conv_1", userId: "usr_1", messageCount: 5 });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(conv);

      const result = await interactor.archiveActive("usr_1");
      expect(result).not.toBeNull();
      if (!result) {
        throw new Error("Expected archived conversation result");
      }
      expect(result.id).toBe("conv_1");
      expect(convRepo.archiveByUser).toHaveBeenCalledWith("usr_1");
    });

    it("returns null when no active conversation", async () => {
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await interactor.archiveActive("usr_1");
      expect(result).toBeNull();
      expect(convRepo.archiveByUser).not.toHaveBeenCalled();
    });
  });

  describe("recordToolUsed", () => {
    it("sets last_tool_used on conversation", async () => {
      await interactor.recordToolUsed("conv_1", "search_library", "AUTHENTICATED");
      expect(convRepo.setLastToolUsed).toHaveBeenCalledWith("conv_1", "search_library");
    });
  });

  describe("migrateAnonymousConversations", () => {
    it("transfers ownership and returns migrated ids", async () => {
      (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(["conv_a", "conv_b"]);

      const migratedIds = await interactor.migrateAnonymousConversations("anon_123", "usr_1");
      expect(migratedIds).toEqual(["conv_a", "conv_b"]);
      expect(convRepo.transferOwnership).toHaveBeenCalledWith("anon_123", "usr_1");
    });

    it("returns an empty array when no conversations to migrate", async () => {
      (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const migratedIds = await interactor.migrateAnonymousConversations("anon_123", "usr_1");
      expect(migratedIds).toEqual([]);
    });
  });

  describe("event recording", () => {
    let eventRecorder: { record: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      eventRecorder = { record: vi.fn().mockResolvedValue(undefined) };
      const mocks = createMockRepos();
      convRepo = mocks.convRepo;
      msgRepo = mocks.msgRepo;
      interactor = new ConversationInteractor(convRepo, msgRepo, eventRecorder as never);
    });

    it("emits 'started' event on create", async () => {
      await interactor.create("usr_1");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        expect.stringMatching(/^conv_/),
        "started",
        expect.objectContaining({ session_source: "authenticated" }),
      );
    });

    it("emits 'started' with anonymous_cookie session_source for anon users", async () => {
      await interactor.create("anon_abc123");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        expect.stringMatching(/^conv_/),
        "started",
        expect.objectContaining({ session_source: "anonymous_cookie" }),
      );
    });

    it("emits 'archived' event with message_count and duration_hours", async () => {
      const conv = makeConversation({ id: "conv_1", userId: "usr_1", messageCount: 10 });
      (convRepo.findActiveByUser as ReturnType<typeof vi.fn>).mockResolvedValue(conv);

      await interactor.archiveActive("usr_1");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_1",
        "archived",
        expect.objectContaining({ message_count: 10, duration_hours: expect.any(Number) }),
      );
    });

    it("emits 'tool_used' event on recordToolUsed", async () => {
      await interactor.recordToolUsed("conv_1", "calculator", "AUTHENTICATED");
      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_1",
        "tool_used",
        { tool_name: "calculator", role: "AUTHENTICATED" },
      );
    });

    it("emits 'converted' events only for migrated conversations", async () => {
      (convRepo.transferOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(["conv_a"]);

      await interactor.migrateAnonymousConversations("anon_123", "usr_1");
      expect(eventRecorder.record).toHaveBeenCalledTimes(1);
      expect(eventRecorder.record).toHaveBeenCalledWith(
        "conv_a",
        "converted",
        { from: "anon_123", to: "usr_1" },
      );
    });
  });
});
