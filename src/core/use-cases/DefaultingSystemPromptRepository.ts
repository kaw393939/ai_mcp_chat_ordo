import type {
  SystemPrompt,
  SystemPromptRepository,
} from "@/core/use-cases/SystemPromptRepository";

/**
 * Decorator that returns fallback content when the inner repository
 * has no active prompt (Null Object pattern — getActive() never returns null).
 */
export class DefaultingSystemPromptRepository implements SystemPromptRepository {
  constructor(
    private readonly inner: SystemPromptRepository,
    private readonly fallbackBase: string,
    private readonly fallbackDirectives: Record<string, string>,
  ) {}

  async getActive(role: string, promptType: string): Promise<SystemPrompt> {
    const result = await this.inner.getActive(role, promptType);
    if (result) return result;

    const content =
      promptType === "base"
        ? this.fallbackBase
        : this.fallbackDirectives[role] ?? "";

    return {
      id: "fallback",
      role,
      promptType: promptType as "base" | "role_directive",
      content,
      version: 0,
      isActive: true,
      createdAt: "",
      createdBy: null,
      notes: "hardcoded fallback",
    };
  }

  async listVersions(role: string, promptType: string): Promise<SystemPrompt[]> {
    return this.inner.listVersions(role, promptType);
  }

  async getByVersion(
    role: string,
    promptType: string,
    version: number,
  ): Promise<SystemPrompt | null> {
    return this.inner.getByVersion(role, promptType, version);
  }

  async createVersion(params: {
    role: string;
    promptType: string;
    content: string;
    createdBy: string;
    notes: string;
  }): Promise<SystemPrompt> {
    return this.inner.createVersion(params);
  }

  async activate(role: string, promptType: string, version: number): Promise<void> {
    return this.inner.activate(role, promptType, version);
  }
}
