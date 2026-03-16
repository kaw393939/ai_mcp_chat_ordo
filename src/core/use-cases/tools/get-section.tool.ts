import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { BookRepository } from "../BookRepository";
import { GetSectionCommand } from "./CorpusTools";

export function createGetSectionTool(repo: BookRepository): ToolDescriptor {
  return {
    name: "get_section",
    schema: {
      description: "Retrieve full content of a specific section.",
      input_schema: {
        type: "object",
        properties: {
          document_slug: { type: "string" },
          section_slug: { type: "string" },
        },
        required: ["document_slug", "section_slug"],
      },
    },
    command: new GetSectionCommand(repo),
    roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
    category: "content",
  };
}