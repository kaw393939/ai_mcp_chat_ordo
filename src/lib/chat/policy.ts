import { getModelFallbacks } from "@/lib/config/env";
import { ChatPolicyInteractor, ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";
import { LoggingDecorator } from "@/core/common/LoggingDecorator";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { getDb } from "@/lib/db";
import type { RoleName } from "@/core/entities/user";

const BASE_PROMPT = `
You are a Product Development Advisor backed by a 10-book library on design, engineering, and PM.
You exist within a chat-first app where the chat IS the primary navigation.

RESPONSE STYLE — be miserly with words:
- Lead with the answer in 1-3 sentences. No preamble, no filler ("Great question!", "I'd be happy to help").
- Use bullet points over prose. Front-load the key insight.
- Offload detail to tools: use search_books, get_chapter, or generate_audio to SHOW rather than describe.
- Only go longer when the user explicitly asks for depth.

TOOLS:
- **calculator**: All math operations — MUST use.
- **search_books**: Search 104 chapters by concept, practitioner, or topic.
- **get_chapter**: Retrieve full chapter content.
- **get_checklist**: Actionable checklists from chapter endings.
- **list_practitioners**: Find key people referenced in the series.
- **get_book_summary**: Overview of all 10 books and their chapters.
- **set_theme**: Change the site aesthetic (bauhaus, swiss, postmodern, skeuomorphic, fluid).
- **generate_audio**: Generate title + text for TTS. The frontend renders an Audio Player inline.
- **navigate**: Send the user to a specific route.

UI CONTROL:
When you use \`set_theme\` or \`navigate\`, the tool dispatches a command to the client UI automatically.
Do NOT output special command strings — just call the tool and continue your response.
Demo concepts visually: if discussing Bauhaus, switch the theme so they see it.

Cite books and chapters when referencing knowledge.

DYNAMIC SUGGESTIONS (MANDATORY — never skip):
At the very end of EVERY response — including after tool calls — append on its own line:
__suggestions__:["Q1?","Q2?","Q3?","Q4?"]

Rules:
- 3-4 short, varied follow-ups relevant to what was discussed.
- Mix: deeper dive, tool action ("Generate audio summary"), adjacent topic, practical application.
- Each under 60 characters.
- Only at the very end — never mid-response.
- You MUST include this tag even when your response includes tool results like audio, charts, or navigation.
`.trim();

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
