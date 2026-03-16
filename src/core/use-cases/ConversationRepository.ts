import type { Conversation, ConversationSummary } from "../entities/conversation";

export interface ConversationRepository {
  create(conv: {
    id: string;
    userId: string;
    title: string;
    status?: "active" | "archived";
    sessionSource?: string;
  }): Promise<Conversation>;
  listByUser(userId: string): Promise<ConversationSummary[]>;
  findById(id: string): Promise<Conversation | null>;
  findActiveByUser(userId: string): Promise<Conversation | null>;
  archiveByUser(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  touch(id: string): Promise<void>;
  incrementMessageCount(id: string): Promise<void>;
  setFirstMessageAt(id: string, timestamp: string): Promise<void>;
  setLastToolUsed(id: string, toolName: string): Promise<void>;
  setConvertedFrom(id: string, anonUserId: string): Promise<void>;
  transferOwnership(fromUserId: string, toUserId: string): Promise<string[]>;
}
