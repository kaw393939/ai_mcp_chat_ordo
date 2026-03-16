import { NextResponse } from "next/server";
import fs from "fs";
import { resolveUserId } from "@/lib/chat/resolve-user";
import { getDb } from "@/lib/db";
import { UserFileDataMapper } from "@/adapters/UserFileDataMapper";
import { UserFileSystem } from "@/lib/user-files";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await resolveUserId();

    const { id } = await params;
    const repo = new UserFileDataMapper(getDb());
    const ufs = new UserFileSystem(repo);
    const result = await ufs.getById(id);

    if (!result) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Ensure the requesting user owns this file
    if (result.file.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = fs.readFileSync(result.diskPath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": result.file.mimeType,
        "Content-Length": String(result.file.fileSize),
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("User file serve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
