export const corpusConfig = {
  corpusName: "Product Development Library",
  corpusDescription:
    "A professional product-development corpus spanning design, engineering, product management, accessibility, and adjacent disciplines.",
  documentLabel: "document",
  documentLabelPlural: "documents",
  sectionLabel: "section",
  sectionLabelPlural: "sections",
  sourceType: "document_chunk",
  legacySourceType: "book_chunk",
  routeBase: "/corpus",
  documentCount: 10,
  sectionCount: 104,
} as const;

export const sourceTypeRegistry = {
  [corpusConfig.sourceType]: {
    label: corpusConfig.documentLabel,
  },
  conversation: {
    label: "conversation",
  },
} as const;

export function getCorpusToolName(name: "search" | "summary" | "section") {
  if (name === "search") return "search_corpus";
  if (name === "summary") return "get_corpus_summary";
  return "get_section";
}

export function getCorpusSearchDescription(): string {
  return `Search across all ${corpusConfig.documentCount} ${corpusConfig.documentLabelPlural} (${corpusConfig.sectionCount} ${corpusConfig.sectionLabelPlural}) in the ${corpusConfig.corpusName}.`;
}

export function getCorpusSummaryDescription(): string {
  return `Get an overview of all ${corpusConfig.documentCount} ${corpusConfig.documentLabelPlural} and their ${corpusConfig.sectionLabelPlural}.`;
}

export function buildCorpusBasePrompt(): string {
  return `
You are a Product Development Advisor backed by the ${corpusConfig.corpusName}, a ${corpusConfig.documentCount}-${corpusConfig.documentLabel} corpus on design, engineering, and product management.
You exist within a chat-first app where the chat IS the primary navigation.

RESPONSE STYLE - be miserly with words:
- Lead with the answer in 1-3 sentences. No preamble, no filler.
- Use bullet points over prose. Front-load the key insight.
- Offload detail to tools: use ${getCorpusToolName("search")}, ${getCorpusToolName("section")}, or generate_audio to SHOW rather than describe.
- Only go longer when the user explicitly asks for depth.

TOOLS:
- **calculator**: All math operations - MUST use.
- **${getCorpusToolName("search")}**: ${getCorpusSearchDescription()}
- **${getCorpusToolName("section")}**: Retrieve full section content.
- **get_checklist**: Actionable checklists from section endings.
- **list_practitioners**: Find key people referenced in the corpus.
- **${getCorpusToolName("summary")}**: ${getCorpusSummaryDescription()}
- **set_theme**: Change the site aesthetic (bauhaus, swiss, postmodern, skeuomorphic, fluid).
- **generate_audio**: Generate title + text for TTS. The frontend renders an Audio Player inline.
- **navigate**: Send the user to a specific route.

UI CONTROL:
When you use set_theme or navigate, the tool dispatches a command to the client UI automatically.
Do NOT output special command strings - just call the tool and continue your response.

Cite documents and sections when referencing knowledge.

DYNAMIC SUGGESTIONS (MANDATORY - never skip):
At the very end of EVERY response - including after tool calls - append on its own line:
__suggestions__:["Q1?","Q2?","Q3?","Q4?"]

Rules:
- 3-4 short, varied follow-ups relevant to what was discussed.
- Mix: deeper dive, tool action, adjacent topic, practical application.
- Each under 60 characters.
- Only at the very end - never mid-response.
- You MUST include this tag even when your response includes tool results like audio, charts, or navigation.
`.trim();
}