import { describe, it, expect } from "vitest";
import { CachedBookRepository } from "@/adapters/CachedBookRepository";
import type { BookRepository } from "@/core/use-cases/BookRepository";
import type { Book } from "@/core/entities/library";
import { Chapter } from "@/core/entities/library";

function createMockRepo(): BookRepository & { callCounts: Record<string, number> } {
  const callCounts: Record<string, number> = {
    getAllBooks: 0,
    getBook: 0,
    getChaptersByBook: 0,
    getAllChapters: 0,
    getChapter: 0,
  };

  const book: Book = { slug: "book-1", title: "Book One", number: "1" };
  const chapter = new Chapter("book-1", "ch-1", "Chapter One", "Content", [], [], []);

  return {
    callCounts,
    async getAllBooks() { callCounts.getAllBooks++; return [book]; },
    async getBook(slug: string) { callCounts.getBook++; return slug === "book-1" ? book : null; },
    async getChaptersByBook() { callCounts.getChaptersByBook++; return [chapter]; },
    async getAllChapters() { callCounts.getAllChapters++; return [chapter]; },
    async getChapter() { callCounts.getChapter++; return chapter; },
  };
}

describe("CachedBookRepository", () => {
  // TEST-CACHE-01
  it("getAllChapters called twice → inner called once", async () => {
    const mock = createMockRepo();
    const cached = new CachedBookRepository(mock);

    await cached.getAllChapters();
    await cached.getAllChapters();

    expect(mock.callCounts.getAllChapters).toBe(1);
  });

  // TEST-CACHE-02
  it("getChapter with same key called twice → inner called once", async () => {
    const mock = createMockRepo();
    const cached = new CachedBookRepository(mock);

    await cached.getChapter("book-1", "ch-1");
    await cached.getChapter("book-1", "ch-1");

    expect(mock.callCounts.getChapter).toBe(1);
  });

  // TEST-CACHE-03
  it("getChapter with different keys → inner called for each unique key", async () => {
    const mock = createMockRepo();
    const cached = new CachedBookRepository(mock);

    await cached.getChapter("book-1", "ch-1");
    await cached.getChapter("book-1", "ch-2");

    expect(mock.callCounts.getChapter).toBe(2);
  });

  // TEST-CACHE-04
  it("getAllBooks cached independently from getAllChapters", async () => {
    const mock = createMockRepo();
    const cached = new CachedBookRepository(mock);

    await cached.getAllBooks();
    await cached.getAllChapters();
    await cached.getAllBooks();
    await cached.getAllChapters();

    expect(mock.callCounts.getAllBooks).toBe(1);
    expect(mock.callCounts.getAllChapters).toBe(1);
  });
});
