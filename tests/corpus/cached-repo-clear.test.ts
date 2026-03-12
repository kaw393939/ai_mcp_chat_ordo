import { describe, it, expect, vi, beforeEach } from "vitest";
import { CachedBookRepository } from "@/adapters/CachedBookRepository";
import type { BookRepository } from "@/core/use-cases/BookRepository";
import type { Book, Chapter } from "@/core/entities/library";

function makeBook(slug: string): Book {
  return { slug, title: `Book ${slug}`, number: "I" };
}

function makeMockInner(initial: Book[]) {
  const books = [...initial];
  return {
    repo: {
      getAllBooks: vi.fn(async () => [...books]),
      getBook: vi.fn(async (slug: string) => books.find((b) => b.slug === slug) ?? null),
      getChaptersByBook: vi.fn(async () => [] as Chapter[]),
      getAllChapters: vi.fn(async () => [] as Chapter[]),
      getChapter: vi.fn(async () => ({}) as Chapter),
    } satisfies BookRepository,
    addBook(slug: string) {
      books.push(makeBook(slug));
    },
  };
}

describe("CachedBookRepository — clearCache", () => {
  let inner: ReturnType<typeof makeMockInner>;
  let cached: CachedBookRepository;

  beforeEach(() => {
    inner = makeMockInner([makeBook("alpha")]);
    cached = new CachedBookRepository(inner.repo);
  });

  it("resets all caches so next call re-fetches from inner", async () => {
    // Populate caches
    await cached.getAllBooks();
    await cached.getBook("alpha");
    expect(inner.repo.getAllBooks).toHaveBeenCalledTimes(1);
    expect(inner.repo.getBook).toHaveBeenCalledTimes(1);

    // Clear and re-fetch
    cached.clearCache();
    await cached.getAllBooks();
    await cached.getBook("alpha");
    expect(inner.repo.getAllBooks).toHaveBeenCalledTimes(2);
    expect(inner.repo.getBook).toHaveBeenCalledTimes(2);
  });

  it("returns fresh data after inner source changes", async () => {
    // Warm cache — 1 book
    const before = await cached.getAllBooks();
    expect(before).toHaveLength(1);

    // Mutate underlying source
    inner.addBook("beta");

    // Cache still stale
    expect(await cached.getAllBooks()).toHaveLength(1);

    // After clear — picks up the new book
    cached.clearCache();
    const after = await cached.getAllBooks();
    expect(after).toHaveLength(2);
    expect(after.map((b) => b.slug)).toContain("beta");
  });
});
