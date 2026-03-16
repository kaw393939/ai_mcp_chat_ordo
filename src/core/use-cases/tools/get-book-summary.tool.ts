import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { BookRepository } from "../BookRepository";
import { GetBookSummaryCommand } from "./CorpusTools";
import { getCorpusSummaryDescription } from "@/lib/corpus-config";

export function createGetBookSummaryTool(repo: BookRepository): ToolDescriptor {
  return {
    name: "get_book_summary",
    schema: {
      description: getCorpusSummaryDescription(),
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new GetBookSummaryCommand(repo),
    roles: "ALL",
    category: "content",
  };
}
