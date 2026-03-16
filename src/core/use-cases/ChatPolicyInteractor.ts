import type { UseCase } from "../common/UseCase";
import type { RoleName } from "../entities/user";
import type { SystemPromptRepository } from "./SystemPromptRepository";

/**
 * Fallback ROLE_DIRECTIVES — used by DefaultingSystemPromptRepository
 * when the database has no active prompt. Exported for seed reference.
 */
export const ROLE_DIRECTIVES: Record<RoleName, string> = {
  ANONYMOUS: [
    "",
    "ROLE CONTEXT — DEMO MODE:",
    "The user is browsing without an account. They have limited tool access (no full chapter content, no audio generation).",
    "Encourage them to sign up for full access when relevant, but stay helpful within the demo scope.",
  ].join("\n"),
  AUTHENTICATED: [
    "",
    "ROLE CONTEXT — REGISTERED USER:",
    "The user is a registered member with full access to all tools and content.",
    "You have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
  ].join("\n"),
  STAFF: [
    "",
    "ROLE CONTEXT — STAFF MEMBER:",
    "The user is a staff member. Full tool access with an analytics and operational framing.",
    "You have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
  ].join("\n"),
  ADMIN: [
    "",
    "ROLE CONTEXT — SYSTEM ADMINISTRATOR:",
    "The user is a system administrator with full control over all tools, content, and configuration.",
    "",
    "ADMIN-ONLY CAPABILITIES (Corpus Management — via MCP Librarian tools):",
    "- **librarian_list**: List all books in the corpus with metadata.",
    "- **librarian_get_book**: Get a specific book's details and chapters.",
    "- **librarian_add_book**: Add a new book (manual fields or zip archive upload).",
    "- **librarian_add_chapter**: Add a chapter to an existing book.",
    "- **librarian_remove_book**: Remove a book and all its chapters.",
    "- **librarian_remove_chapter**: Remove a single chapter from a book.",
    "These corpus management tools are available through the MCP embedding server, not as direct chat tools.",
    "When the admin asks about content management, mention these capabilities.",
    "",
    "ADMIN-ONLY TOOL — Web Search:",
    "- **admin_web_search**: Search the live web and return a sourced answer with citations. Use allowed_domains to target specific sites (e.g., allowed_domains=['en.wikipedia.org'] for Wikipedia research). You MUST call this tool directly when the admin asks you to search the web.",
    "",
    "You also have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
  ].join("\n"),
};

export class ChatPolicyInteractor
  implements UseCase<{ role: RoleName }, string>
{
  constructor(private readonly promptRepo: SystemPromptRepository) {}

  async execute({ role }: { role: RoleName }): Promise<string> {
    const base = await this.promptRepo.getActive("ALL", "base");
    const directive = await this.promptRepo.getActive(role, "role_directive");
    return (base?.content ?? "") + (directive?.content ?? "");
  }
}
