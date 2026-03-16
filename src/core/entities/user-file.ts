/**
 * Domain entity for user-generated files (audio, charts, etc.).
 * Files are cached on disk and tracked in the database so they
 * survive page reloads without regeneration.
 */
export interface UserFile {
  id: string;
  userId: string;
  conversationId: string | null;
  contentHash: string;
  fileType: "audio" | "chart" | "document";
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}
