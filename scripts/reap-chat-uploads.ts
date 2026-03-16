import { reapStaleChatUploads } from "../src/lib/chat/upload-reaper";

async function main() {
  const report = await reapStaleChatUploads();
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

void main();