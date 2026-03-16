import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { UserFile } from "@/core/entities/user-file";
import type { UserFileRepository } from "@/core/use-cases/UserFileRepository";

const USER_FILES_ROOT = path.join(process.cwd(), ".data", "user-files");

export function getUserFilePath(userId: string, fileName: string): string {
  return path.join(USER_FILES_ROOT, userId, fileName);
}

export function contentHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export class UserFileSystem {
  constructor(private repo: UserFileRepository) {}

  /**
   * Check if a file already exists for this user + content + type.
   * Returns the UserFile record and on-disk path if cached.
   */
  async lookup(
    userId: string,
    input: string,
    fileType: UserFile["fileType"],
  ): Promise<{ file: UserFile; diskPath: string } | null> {
    const hash = contentHash(input);
    const file = await this.repo.findByHash(userId, hash, fileType);
    if (!file) return null;

    const diskPath = getUserFilePath(userId, file.fileName);
    if (!fs.existsSync(diskPath)) {
      // DB record exists but file was deleted — clean up
      await this.repo.delete(file.id);
      return null;
    }

    return { file, diskPath };
  }

  /**
   * Store generated file bytes and create a DB record.
   * Returns the new UserFile.
   */
  async store(params: {
    userId: string;
    conversationId: string | null;
    input: string;
    fileType: UserFile["fileType"];
    mimeType: string;
    extension: string;
    data: Buffer;
  }): Promise<UserFile> {
    const hash = contentHash(params.input);
    const fileName = `${hash}.${params.extension}`;
    const diskPath = getUserFilePath(params.userId, fileName);

    // Ensure user directory exists
    const dir = path.dirname(diskPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(diskPath, params.data);

    const id = `uf_${crypto.randomUUID()}`;
    return this.repo.create({
      id,
      userId: params.userId,
      conversationId: params.conversationId,
      contentHash: hash,
      fileType: params.fileType,
      fileName,
      mimeType: params.mimeType,
      fileSize: params.data.length,
    });
  }

  /**
   * Retrieve a file by its DB id. Returns the record + disk path.
   */
  async getById(
    id: string,
  ): Promise<{ file: UserFile; diskPath: string } | null> {
    const file = await this.repo.findById(id);
    if (!file) return null;

    const diskPath = getUserFilePath(file.userId, file.fileName);
    if (!fs.existsSync(diskPath)) {
      await this.repo.delete(file.id);
      return null;
    }

    return { file, diskPath };
  }
}
