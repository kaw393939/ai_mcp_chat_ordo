import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { BookRepository } from "../BookRepository";
import { GetCorpusSummaryCommand } from "./CorpusTools";
import { getCorpusSummaryDescription } from "@/lib/corpus-config";

export function createGetCorpusSummaryTool(repo: BookRepository): ToolDescriptor {
  return {
    name: "get_corpus_summary",
    schema: {
      description: getCorpusSummaryDescription(),
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetCorpusSummaryCommand(repo),
    roles: "ALL",
    category: "content",
  };
}