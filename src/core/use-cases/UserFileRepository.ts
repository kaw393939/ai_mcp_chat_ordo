import type { UserFile } from "../entities/user-file";

export interface UserFileRepository {
  create(file: Omit<UserFile, "createdAt">): Promise<UserFile>;
  findById(id: string): Promise<UserFile | null>;
  findByHash(userId: string, contentHash: string, fileType: UserFile["fileType"]): Promise<UserFile | null>;
  listByConversation(conversationId: string): Promise<UserFile[]>;
  listByUser(userId: string): Promise<UserFile[]>;
  listUnattachedCreatedBefore(cutoffIso: string, options?: {
    userId?: string;
    fileType?: UserFile["fileType"];
  }): Promise<UserFile[]>;
  assignConversation(fileIds: string[], userId: string, conversationId: string): Promise<void>;
  deleteIfUnattached(id: string, userId: string): Promise<UserFile | null>;
  delete(id: string): Promise<void>;
}
