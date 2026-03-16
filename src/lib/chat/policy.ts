import { getModelFallbacks } from "@/lib/config/env";
import { ChatPolicyInteractor, ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";
import { LoggingDecorator } from "@/core/common/LoggingDecorator";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { getDb } from "@/lib/db";
import type { RoleName } from "@/core/entities/user";
import { buildCorpusBasePrompt } from "@/lib/corpus-config";

const BASE_PROMPT = buildCorpusBasePrompt();

export async function buildSystemPrompt(role: RoleName): Promise<string> {
  const db = getDb();
  const innerRepo = new SystemPromptDataMapper(db);
  const promptRepo = new DefaultingSystemPromptRepository(
    innerRepo,
    BASE_PROMPT,
    ROLE_DIRECTIVES,
  );
  const interactor = new LoggingDecorator(
    new ChatPolicyInteractor(promptRepo),
    "ChatPolicy",
  );
  return interactor.execute({ role });
}

export function looksLikeMath(text: string): boolean {
  const value = text.toLowerCase();

  return (
    /\d\s*[+\-*/]\s*\d/.test(value) ||
    /\b(add|subtract|minus|plus|sum|difference|multiply|times|product|divide|quotient|calculate|math)\b/.test(
      value,
    )
  );
}

export function getModelCandidates(): string[] {
  return getModelFallbacks();
}
