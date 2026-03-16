import type { ConversationRepository } from "./ConversationRepository";
import type { MessageRepository } from "./MessageRepository";
import type { ConversationEventRecorder } from "./ConversationEventRecorder";
import type { Conversation, ConversationSummary, Message, NewMessage } from "../entities/conversation";

const MAX_MESSAGES_PER_CONVERSATION = 200;
const AUTO_TITLE_MAX_LENGTH = 80;

export class ConversationInteractor {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly eventRecorder?: ConversationEventRecorder,
  ) {}

  async create(
    userId: string,
    title: string = "",
    options?: { sessionSource?: string },
  ): Promise<Conversation> {
    // Archive any existing active conversation before creating a new one
    await this.conversationRepo.archiveByUser(userId);

    const id = `conv_${crypto.randomUUID()}`;
    const sessionSource = options?.sessionSource ?? (userId.startsWith("anon_") ? "anonymous_cookie" : "authenticated");
    const conversation = await this.conversationRepo.create({
      id,
      userId,
      title,
      status: "active",
      sessionSource,
    });

    await this.eventRecorder?.record(id, "started", { session_source: sessionSource });

    return conversation;
  }

  async get(conversationId: string, userId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }
    const messages = await this.messageRepo.listByConversation(conversationId);
    return { conversation, messages };
  }

  async getActiveForUser(userId: string): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const conversation = await this.conversationRepo.findActiveByUser(userId);
    if (!conversation) return null;
    const messages = await this.messageRepo.listByConversation(conversation.id);
    return { conversation, messages };
  }

  async list(userId: string): Promise<ConversationSummary[]> {
    return this.conversationRepo.listByUser(userId);
  }

  async delete(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }
    await this.conversationRepo.delete(conversationId);
  }

  async archiveActive(userId: string): Promise<Conversation | null> {
    const active = await this.conversationRepo.findActiveByUser(userId);
    if (!active) return null;

    await this.conversationRepo.archiveByUser(userId);

    const durationMs = new Date().getTime() - new Date(active.createdAt).getTime();
    const durationHours = Math.round((durationMs / 3_600_000) * 10) / 10;

    await this.eventRecorder?.record(active.id, "archived", {
      message_count: active.messageCount,
      duration_hours: durationHours,
    });

    return active;
  }

  async appendMessage(msg: NewMessage, userId: string): Promise<Message> {
    const conversation = await this.conversationRepo.findById(msg.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundError("Conversation not found");
    }

    const count = await this.messageRepo.countByConversation(msg.conversationId);
    if (count >= MAX_MESSAGES_PER_CONVERSATION) {
      throw new MessageLimitError(`Conversation has reached the ${MAX_MESSAGES_PER_CONVERSATION}-message limit`);
    }

    const tokenEstimate = Math.ceil(msg.content.length / 4);
    const message = await this.messageRepo.create({ ...msg, tokenEstimate });

    // Auto-title from first user message
    if (msg.role === "user" && !conversation.title) {
      const title = msg.content.slice(0, AUTO_TITLE_MAX_LENGTH);
      await this.conversationRepo.updateTitle(msg.conversationId, title);
    }

    // Update denormalized metadata
    await this.conversationRepo.incrementMessageCount(msg.conversationId);
    await this.conversationRepo.setFirstMessageAt(msg.conversationId, message.createdAt);
    await this.conversationRepo.touch(msg.conversationId);

    // Record event
    if (msg.role === "user") {
      await this.eventRecorder?.record(msg.conversationId, "message_sent", {
        role: "user",
        token_estimate: tokenEstimate,
      });
    }

    return message;
  }

  async recordToolUsed(conversationId: string, toolName: string, role: string): Promise<void> {
    await this.conversationRepo.setLastToolUsed(conversationId, toolName);
    await this.eventRecorder?.record(conversationId, "tool_used", {
      tool_name: toolName,
      role,
    });
  }

  async migrateAnonymousConversations(
    anonUserId: string,
    newUserId: string,
  ): Promise<string[]> {
    const migratedIds = await this.conversationRepo.transferOwnership(anonUserId, newUserId);

    for (const convId of migratedIds) {
      await this.eventRecorder?.record(convId, "converted", {
        from: anonUserId,
        to: newUserId,
      });
    }

    return migratedIds;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class MessageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageLimitError";
  }
}
