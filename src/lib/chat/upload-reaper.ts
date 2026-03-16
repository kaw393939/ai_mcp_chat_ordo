import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { getDb } from "@/lib/db";
import {
  CHAT_UPLOAD_REAPER_TTL_MINUTES,
  UserFileSystem,
} from "@/lib/user-files";

interface ReapStaleChatUploadsOptions {
  olderThanMinutes?: number;
  userId?: string;
}

interface ReapStaleChatUploadsResult {
  deletedCount: number;
  deletedIds: string[];
  olderThanMinutes: number;
  userId: string | null;
}

export async function reapStaleChatUploads(
  options: ReapStaleChatUploadsOptions = {},
): Promise<ReapStaleChatUploadsResult> {
  const olderThanMinutes =
    options.olderThanMinutes ?? CHAT_UPLOAD_REAPER_TTL_MINUTES;
  const ufs = new UserFileSystem(new UserFileDataMapper(getDb()));
  const deletedIds = await ufs.reapUnattachedFiles({
    olderThanMinutes,
    userId: options.userId,
    fileType: "document",
  });

  return {
    deletedCount: deletedIds.length,
    deletedIds,
    olderThanMinutes,
    userId: options.userId ?? null,
  };
}