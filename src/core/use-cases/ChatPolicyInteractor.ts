import type { UseCase } from "../common/UseCase";
import type { RoleName } from "../entities/user";

const ROLE_DIRECTIVES: Record<RoleName, string> = {
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
  ].join("\n"),
  STAFF: [
    "",
    "ROLE CONTEXT — STAFF MEMBER:",
    "The user is a staff member. Full tool access with an analytics and operational framing.",
  ].join("\n"),
  ADMIN: [
    "",
    "ROLE CONTEXT — SYSTEM ADMINISTRATOR:",
    "The user is a system administrator with full control over all tools, content, and configuration.",
  ].join("\n"),
};

export class ChatPolicyInteractor
  implements UseCase<{ role: RoleName }, string>
{
  constructor(private readonly basePrompt: string) {}

  async execute({ role }: { role: RoleName }): Promise<string> {
    const directive = ROLE_DIRECTIVES[role] ?? ROLE_DIRECTIVES.ANONYMOUS;
    return this.basePrompt + directive;
  }
}
