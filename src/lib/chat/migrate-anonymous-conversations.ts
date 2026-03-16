import { cookies } from "next/headers";
import { getConversationInteractor } from "@/lib/chat/conversation-root";
import { repairConversationOwnershipIndex } from "@/lib/chat/embed-conversation";
import { clearAnonSession } from "@/lib/chat/resolve-user";

export async function migrateAnonymousConversationsToUser(
  userId: string,
  source: "login" | "registration",
): Promise<{ migratedConversationIds: string[] }> {
  const cookieStore = await cookies();
  const anonCookie = cookieStore.get("lms_anon_session")?.value;

  if (!anonCookie) {
    return { migratedConversationIds: [] };
  }

  const anonUserId = `anon_${anonCookie}`;
  const interactor = getConversationInteractor();
  const migratedConversationIds = await interactor.migrateAnonymousConversations(
    anonUserId,
    userId,
  );

  await Promise.all(
    migratedConversationIds.map((conversationId) =>
      repairConversationOwnershipIndex(conversationId, userId, anonUserId)
        .catch((error) => {
          console.error(
            `Conversation index repair failed during ${source}:`,
            error,
          );
        }),
    ),
  );

  await clearAnonSession();

  return { migratedConversationIds };
}