import { repairConvertedConversationOwnershipIndexes } from "@/lib/chat/embed-conversation";

async function main() {
  const result = await repairConvertedConversationOwnershipIndexes();
  console.log(`Repaired ${result.repaired} converted conversation index entries.`);
}

main().catch((error) => {
  console.error("Failed to repair converted conversation indexes:", error);
  process.exitCode = 1;
});