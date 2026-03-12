import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import type { BookRepository } from "../core/use-cases/BookRepository";
import type { Book } from "../core/entities/library";
import { Chapter } from "../core/entities/library";
import { ResourceNotFoundError } from "../core/entities/errors";

export const DEFAULT_DOCS_DIR = "docs";
const CORPUS_DIR = "_corpus";
const VALID_DOMAINS = new Set([
  "teaching",
  "sales",
  "customer-service",
  "reference",
  "internal",
]);

import { ExtractPractitioners } from "../core/use-cases/ExtractPractitioners";
import { AnalyzeChapterChecklist } from "../core/use-cases/AnalyzeChapterChecklist";

interface BookMeta {
  slug: string;
  title: string;
  shortTitle: string;
  number: string;
  chaptersDir: string;
}

interface BookManifest {
  slug: string;
  title: string;
  number: string;
  sortOrder: number;
  domain: string[];
  tags?: string[];
}

export class FileSystemBookRepository implements BookRepository {
  private readonly practitionerExtractor = new ExtractPractitioners();
  private readonly checklistAnalyzer = new AnalyzeChapterChecklist();
  private discoveredBooks: BookMeta[] | null = null;

  constructor(
    private readonly docsDir: string = path.join(
      process.cwd(),
      DEFAULT_DOCS_DIR,
    ),
  ) {}

  private async discoverBooks(): Promise<BookMeta[]> {
    if (this.discoveredBooks) return this.discoveredBooks;

    const corpusDir = path.join(this.docsDir, CORPUS_DIR);
    let entries: Dirent[];
    try {
      entries = await fs.readdir(corpusDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const booksWithOrder: Array<{ meta: BookMeta; sortOrder: number }> = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await fs.readFile(
          path.join(corpusDir, entry.name, "book.json"),
          "utf-8",
        );
        const manifest: BookManifest = JSON.parse(raw);
        if (typeof manifest.slug !== "string" || !manifest.slug) continue;
        if (typeof manifest.title !== "string" || !manifest.title) continue;
        if (typeof manifest.number !== "string" || !manifest.number) continue;
        if (typeof manifest.sortOrder !== "number") continue;
        if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) continue;
        if (manifest.domain.some((d: string) => !VALID_DOMAINS.has(d))) continue;
        // LIBRARIAN-090: directory name must equal slug
        if (entry.name !== manifest.slug) {
          console.warn(
            `Slug mismatch: dir "${entry.name}" vs slug "${manifest.slug}" — skipping`,
          );
          continue;
        }
        booksWithOrder.push({
          meta: {
            slug: manifest.slug,
            title: manifest.title,
            shortTitle: manifest.title,
            number: manifest.number,
            chaptersDir: path.join(CORPUS_DIR, manifest.slug, "chapters"),
          },
          sortOrder: manifest.sortOrder,
        });
      } catch {
        // No book.json or invalid JSON — skip this directory
      }
    }

    this.discoveredBooks = booksWithOrder
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ meta }) => meta);
    return this.discoveredBooks;
  }

  clearDiscoveryCache(): void {
    this.discoveredBooks = null;
  }

  async getAllBooks(): Promise<Book[]> {
    const books = await this.discoverBooks();
    return books.map((b) => ({
      slug: b.slug,
      title: b.title,
      number: b.number,
    }));
  }

  async getBook(slug: string): Promise<Book | null> {
    const books = await this.discoverBooks();
    const book = books.find((b) => b.slug === slug);
    if (!book) return null;
    return {
      slug: book.slug,
      title: book.title,
      number: book.number,
    };
  }

  async getChaptersByBook(bookSlug: string): Promise<Chapter[]> {
    const books = await this.discoverBooks();
    const bookMeta = books.find((b) => b.slug === bookSlug);
    if (!bookMeta) throw new ResourceNotFoundError(`Book not found: ${bookSlug}`);

    const chaptersDir = path.join(this.docsDir, bookMeta.chaptersDir);

    try {
      const files = await fs.readdir(chaptersDir);
      const markdownFiles = files.filter((f) => f.endsWith(".md")).sort();

      const chapters: Chapter[] = [];
      for (const filename of markdownFiles) {
        const slug = filename.replace(/\.md$/, "");
        const content = await fs.readFile(
          path.join(chaptersDir, filename),
          "utf-8",
        );
        chapters.push(this.parseChapter(bookMeta.slug, slug, content));
      }
      return chapters;
    } catch {
      throw new ResourceNotFoundError(`Failed to read chapters for book: ${bookSlug}`);
    }
  }

  async getAllChapters(): Promise<Chapter[]> {
    const books = await this.getAllBooks();
    const allChapters: Chapter[] = [];
    for (const book of books) {
      const chapters = await this.getChaptersByBook(book.slug);
      allChapters.push(...chapters);
    }
    return allChapters;
  }

  async getChapter(
    bookSlug: string,
    chapterSlug: string,
  ): Promise<Chapter> {
    const books = await this.discoverBooks();
    const bookMeta = books.find((b) => b.slug === bookSlug);
    if (!bookMeta) {
      throw new ResourceNotFoundError(`Book not found: ${bookSlug}`);
    }

    const filepath = path.join(
      this.docsDir,
      bookMeta.chaptersDir,
      `${chapterSlug}.md`,
    );
    try {
      const content = await fs.readFile(filepath, "utf-8");
      return this.parseChapter(bookSlug, chapterSlug, content);
    } catch {
      throw new ResourceNotFoundError(`Chapter not found: ${chapterSlug}`);
    }
  }

  private parseChapter(
    bookSlug: string,
    chapterSlug: string,
    content: string,
  ): Chapter {
    const titleMatch = content.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1].trim() : chapterSlug;

    const practitioners = this.practitionerExtractor.execute(content);
    const checklistItems = this.checklistAnalyzer.execute(content);

    const headings = [...content.matchAll(/^##\s+(.*)/gm)].map((m) =>
      m[1].trim(),
    );

    return new Chapter(
      bookSlug,
      chapterSlug,
      title,
      content,
      practitioners,
      checklistItems,
      headings,
    );
  }
}
