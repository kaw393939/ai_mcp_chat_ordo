import * as path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDb } from "@/lib/db";
import { FileSystemBookRepository } from "@/adapters/FileSystemBookRepository";
import { CachedBookRepository } from "@/adapters/CachedBookRepository";
import { LocalEmbedder } from "@/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "@/adapters/SQLiteVectorStore";
import { SQLiteBM25IndexStore } from "@/adapters/SQLiteBM25IndexStore";
import { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import { BM25Scorer } from "@/core/search/BM25Scorer";
import { QueryProcessor } from "@/core/search/QueryProcessor";
import { LowercaseStep } from "@/core/search/query-steps/LowercaseStep";
import { StopwordStep } from "@/core/search/query-steps/StopwordStep";
import { SynonymStep } from "@/core/search/query-steps/SynonymStep";
import { HybridSearchEngine } from "@/core/search/HybridSearchEngine";
import {
  HybridSearchHandler,
  BM25SearchHandler,
  LegacyKeywordHandler,
  EmptyResultHandler,
} from "@/core/search/SearchHandlerChain";
import { STOPWORDS } from "@/core/search/data/stopwords";
import { SYNONYMS } from "@/core/search/data/synonyms";
import type { EmbeddingToolDeps } from "./embedding-tool";
import {
  embedText,
  embedDocument,
  searchSimilar,
  rebuildIndex,
  getIndexStats,
  deleteEmbeddings,
} from "./embedding-tool";
import type { LibrarianToolDeps } from "./librarian-tool";
import {
  librarianList,
  librarianGetBook,
  librarianAddBook,
  librarianAddChapter,
  librarianRemoveBook,
  librarianRemoveChapter,
} from "./librarian-tool";
import type { PromptToolDeps } from "./prompt-tool";
import {
  promptList,
  promptGet,
  promptSet,
  promptRollback,
  promptDiff,
} from "./prompt-tool";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { ConversationEventDataMapper } from "@/adapters/ConversationEventDataMapper";
import { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";

const MODEL_VERSION = "all-MiniLM-L6-v2@1.0";

interface AllDeps {
  embedding: EmbeddingToolDeps;
  librarian: LibrarianToolDeps;
  prompt: PromptToolDeps;
}

function buildDeps(): AllDeps {
  const db = getDb();
  const embedder = new LocalEmbedder();
  const vectorStore = new SQLiteVectorStore(db);
  const bm25IndexStore = new SQLiteBM25IndexStore(db);

  // Build repo graph directly to capture concrete types for cache clearing
  const fsRepo = new FileSystemBookRepository();
  const cached = new CachedBookRepository(fsRepo);
  const bookRepo = cached;

  const pipelineFactory = new EmbeddingPipelineFactory(
    embedder,
    vectorStore,
    MODEL_VERSION,
  );

  const bm25Scorer = new BM25Scorer();
  const vectorProcessor = new QueryProcessor([
    new LowercaseStep(),
    new StopwordStep(STOPWORDS),
  ]);
  const bm25Processor = new QueryProcessor([
    new LowercaseStep(),
    new StopwordStep(STOPWORDS),
    new SynonymStep(SYNONYMS),
  ]);
  const engine = new HybridSearchEngine(
    embedder,
    vectorStore,
    bm25Scorer,
    bm25IndexStore,
    vectorProcessor,
    bm25Processor,
    { vectorTopN: 50, bm25TopN: 50, rrfK: 60, maxResults: 10 },
  );
  const hybrid = new HybridSearchHandler(engine, embedder, bm25IndexStore);
  const bm25 = new BM25SearchHandler(
    bm25Scorer,
    bm25IndexStore,
    vectorStore,
    bm25Processor,
  );
  const legacy = new LegacyKeywordHandler(bookRepo);
  const empty = new EmptyResultHandler();
  hybrid.setNext(bm25);
  bm25.setNext(legacy);
  legacy.setNext(empty);

  return {
    embedding: {
      embedder,
      vectorStore,
      bm25IndexStore,
      searchHandler: hybrid,
      pipelineFactory,
      bookRepo,
    },
    librarian: {
      corpusDir: path.resolve(process.cwd(), "docs/_corpus"),
      vectorStore,
      clearCaches: () => {
        cached.clearCache();
        fsRepo.clearDiscoveryCache();
      },
    },
    prompt: {
      promptRepo: new SystemPromptDataMapper(db),
      eventRecorder: new ConversationEventRecorder(new ConversationEventDataMapper(db)),
      findActiveConversationIds: async (role: string): Promise<string[]> => {
        if (role === "ALL") {
          const rows = db.prepare(`SELECT id FROM conversations WHERE status = 'active'`).all() as { id: string }[];
          return rows.map((r) => r.id);
        }
        if (role === "ANONYMOUS") {
          const rows = db.prepare(`SELECT id FROM conversations WHERE status = 'active' AND user_id LIKE 'anon_%'`).all() as { id: string }[];
          return rows.map((r) => r.id);
        }
        const rows = db.prepare(
          `SELECT c.id FROM conversations c
           JOIN user_roles ur ON c.user_id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE c.status = 'active' AND r.name = ?`
        ).all(role) as { id: string }[];
        return rows.map((r) => r.id);
      },
    },
  };
}

let deps: AllDeps | null = null;
function getDeps(): AllDeps {
  if (!deps) deps = buildDeps();
  return deps;
}

const server = new Server(
  { name: "embedding-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "embed_text",
      description: "Embed arbitrary text, return vector dimensions and preview.",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: { type: "string", description: "Text to embed." },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
    {
      name: "embed_document",
      description:
        "Chunk, embed, and store a document into the vector store.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_type: {
            type: "string",
            description: "Source type (e.g. 'book_chunk').",
          },
          source_id: {
            type: "string",
            description: "Source ID (e.g. 'book-slug/chapter-slug').",
          },
          content: {
            type: "string",
            description: "Document content to embed.",
          },
        },
        required: ["source_type", "source_id", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "search_similar",
      description: "Hybrid similarity search (BM25 + vector + RRF).",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query." },
          source_type: {
            type: "string",
            description: "Filter by source type.",
          },
          limit: { type: "number", description: "Max results." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
    {
      name: "rebuild_index",
      description:
        "Full or incremental rebuild of embeddings for a source type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_type: {
            type: "string",
            description: "Source type to rebuild (e.g. 'book_chunk').",
          },
          force: {
            type: "boolean",
            description: "Force full rebuild (delete existing first).",
          },
        },
        required: ["source_type"],
        additionalProperties: false,
      },
    },
    {
      name: "get_index_stats",
      description: "Embedding counts, BM25 stats, model readiness.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_type: {
            type: "string",
            description: "Source type filter.",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "delete_embeddings",
      description: "Remove all embeddings for a specific source ID.",
      inputSchema: {
        type: "object" as const,
        properties: {
          source_id: {
            type: "string",
            description: "Source ID to delete.",
          },
        },
        required: ["source_id"],
        additionalProperties: false,
      },
    },
    // --- Librarian tools ---
    {
      name: "librarian_list",
      description:
        "List all books in the corpus with chapter counts and indexing status.",
      inputSchema: {
        type: "object" as const,
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "librarian_get_book",
      description:
        "Get details of a corpus book including its chapters.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: { type: "string", description: "Book slug." },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_add_book",
      description:
        "Add a new book to the corpus. Provide slug/title/number/sortOrder/domain/chapters, OR a base64-encoded zip archive containing book.json and chapters/.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: {
            type: "string",
            description:
              "Book slug (lowercase kebab-case). Becomes the directory name.",
          },
          title: { type: "string", description: "Book title." },
          number: {
            type: "string",
            description: "Display number (e.g. 'XI'). Decorative only.",
          },
          sortOrder: { type: "number", description: "Numeric sort order." },
          domain: {
            type: "array",
            description:
              "Content domains (e.g. ['teaching', 'reference']).",
            items: { type: "string" },
          },
          tags: {
            type: "array",
            description:
              "Optional freeform tags (lowercase kebab-case).",
            items: { type: "string" },
          },
          chapters: {
            type: "array",
            description: "Array of {slug, content} chapter objects.",
            items: {
              type: "object",
              properties: {
                slug: { type: "string" },
                content: { type: "string" },
              },
              required: ["slug", "content"],
            },
          },
          zip_base64: {
            type: "string",
            description:
              "Base64-encoded zip archive containing book.json and chapters/. If provided, all other fields are ignored.",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: "librarian_add_chapter",
      description:
        "Add a chapter to an existing book in the corpus. Overwrites if the chapter already exists.",
      inputSchema: {
        type: "object" as const,
        properties: {
          book_slug: {
            type: "string",
            description: "Slug of the target book.",
          },
          chapter_slug: {
            type: "string",
            description: "Chapter slug (becomes filename).",
          },
          content: {
            type: "string",
            description: "Chapter markdown content.",
          },
        },
        required: ["book_slug", "chapter_slug", "content"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_remove_book",
      description:
        "Remove a book and all its embeddings from the corpus.",
      inputSchema: {
        type: "object" as const,
        properties: {
          slug: {
            type: "string",
            description: "Book slug to remove.",
          },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
    {
      name: "librarian_remove_chapter",
      description:
        "Remove a single chapter and its embeddings from a book.",
      inputSchema: {
        type: "object" as const,
        properties: {
          book_slug: { type: "string", description: "Book slug." },
          chapter_slug: {
            type: "string",
            description: "Chapter slug to remove.",
          },
        },
        required: ["book_slug", "chapter_slug"],
        additionalProperties: false,
      },
    },
    // --- Prompt management tools ---
    {
      name: "prompt_list",
      description: "List all system prompt versions, optionally filtered by role and/or prompt_type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Filter by role (e.g. 'ALL', 'ANONYMOUS', 'ADMIN')." },
          prompt_type: { type: "string", description: "Filter by type ('base' or 'role_directive')." },
        },
        additionalProperties: false,
      },
    },
    {
      name: "prompt_get",
      description: "Get a specific system prompt. Returns the active version by default, or a specific version if provided.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version: { type: "number", description: "Specific version number (omit for active)." },
        },
        required: ["role", "prompt_type"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_set",
      description: "Create a new prompt version and immediately activate it. The previous active version is retained.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          content: { type: "string", description: "Full prompt text." },
          notes: { type: "string", description: "Explanation of why this change was made." },
        },
        required: ["role", "prompt_type", "content", "notes"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_rollback",
      description: "Reactivate a previous prompt version.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version: { type: "number", description: "Version number to reactivate." },
        },
        required: ["role", "prompt_type", "version"],
        additionalProperties: false,
      },
    },
    {
      name: "prompt_diff",
      description: "Line-by-line diff between two prompt versions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          role: { type: "string", description: "Prompt role." },
          prompt_type: { type: "string", description: "Prompt type ('base' or 'role_directive')." },
          version_a: { type: "number", description: "First version to compare." },
          version_b: { type: "number", description: "Second version to compare." },
        },
        required: ["role", "prompt_type", "version_a", "version_b"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const d = getDeps();
  const a = (args ?? {}) as Record<string, unknown>;

  let result: unknown;
  switch (name) {
    case "embed_text":
      result = await embedText(d.embedding, a as { text: string });
      break;
    case "embed_document":
      result = await embedDocument(
        d.embedding,
        a as { source_type: string; source_id: string; content: string },
      );
      break;
    case "search_similar":
      result = await searchSimilar(
        d.embedding,
        a as { query: string; source_type?: string; limit?: number },
      );
      break;
    case "rebuild_index":
      result = await rebuildIndex(
        d.embedding,
        a as { source_type: string; force?: boolean },
      );
      break;
    case "get_index_stats":
      result = getIndexStats(d.embedding, a as { source_type?: string });
      break;
    case "delete_embeddings":
      result = deleteEmbeddings(d.embedding, a as { source_id: string });
      break;
    // --- Librarian tools ---
    case "librarian_list":
      result = await librarianList(d.librarian);
      break;
    case "librarian_get_book":
      result = await librarianGetBook(
        d.librarian,
        a as { slug: string },
      );
      break;
    case "librarian_add_book":
      result = await librarianAddBook(
        d.librarian,
        a as {
          slug?: string;
          title?: string;
          number?: string;
          sortOrder?: number;
          domain?: string[];
          tags?: string[];
          chapters?: Array<{ slug: string; content: string }>;
          zip_base64?: string;
        },
      );
      break;
    case "librarian_add_chapter":
      result = await librarianAddChapter(
        d.librarian,
        a as { book_slug: string; chapter_slug: string; content: string },
      );
      break;
    case "librarian_remove_book":
      result = await librarianRemoveBook(
        d.librarian,
        a as { slug: string },
      );
      break;
    case "librarian_remove_chapter":
      result = await librarianRemoveChapter(
        d.librarian,
        a as { book_slug: string; chapter_slug: string },
      );
      break;
    // --- Prompt management tools ---
    case "prompt_list":
      result = await promptList(d.prompt, a as { role?: string; prompt_type?: string });
      break;
    case "prompt_get":
      result = await promptGet(d.prompt, a as { role: string; prompt_type: string; version?: number });
      break;
    case "prompt_set":
      result = await promptSet(d.prompt, a as { role: string; prompt_type: string; content: string; notes: string });
      break;
    case "prompt_rollback":
      result = await promptRollback(d.prompt, a as { role: string; prompt_type: string; version: number });
      break;
    case "prompt_diff":
      result = await promptDiff(d.prompt, a as { role: string; prompt_type: string; version_a: number; version_b: number });
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
