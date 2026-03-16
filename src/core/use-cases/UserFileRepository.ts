import type { UserFile } from "../entities/user-file";

export interface UserFileRepository {
  create(file: Omit<UserFile, "createdAt">): Promise<UserFile>;
  findById(id: string): Promise<UserFile | null>;
  findByHash(userId: string, contentHash: string, fileType: UserFile["fileType"]): Promise<UserFile | null>;
  listByConversation(conversationId: string): Promise<UserFile[]>;
  listByUser(userId: string): Promise<UserFile[]>;
  delete(id: string): Promise<void>;
}
