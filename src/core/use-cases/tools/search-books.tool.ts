import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { BookRepository } from "../BookRepository";
import type { SearchHandler } from "@/core/search/ports/SearchHandler";
import { SearchBooksCommand } from "./CorpusTools";
import { getCorpusSearchDescription } from "@/lib/corpus-config";

export function createSearchBooksTool(repo: BookRepository, searchHandler?: SearchHandler): ToolDescriptor {
  return {
    name: "search_books",
    schema: {
      description: getCorpusSearchDescription(),
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query (concept, person, topic)." },
          max_results: { type: "number", description: "Max results (1-15)." },
        },
        required: ["query"],
      },
    },
    command: new SearchBooksCommand(repo, searchHandler),
    roles: "ALL",
    category: "content",
  };
}
