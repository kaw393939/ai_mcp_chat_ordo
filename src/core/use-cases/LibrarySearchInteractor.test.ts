import { describe, it, expect, vi } from "vitest";
import { LibrarySearchInteractor } from "./LibrarySearchInteractor";
import type { BookRepository } from "./BookRepository";
import type { Book} from "../entities/library";
import { Chapter } from "../entities/library";

describe("LibrarySearchInteractor", () => {
  const mockBooks: Book[] = [
    { slug: "book-1", title: "Book One", number: "1" },
  ];
  const mockChapters: Chapter[] = [
    new Chapter(
      "book-1",
      "ch-1",
      "Bauhaus History",
      "The Bauhaus movement was founded by Walter Gropius. It focused on functional design.",
      ["Walter Gropius"],
      ["Check functionality"],
      ["Founding"]
    ),
  ];

  const mockRepo: BookRepository = {
    getAllBooks: vi.fn().mockResolvedValue(mockBooks),
    getAllChapters: vi.fn().mockResolvedValue(mockChapters),
    getChaptersByBook: vi.fn(),
    getChapter: vi.fn(),
    getBook: vi.fn(),
  };

  it("should find results with exact phrase match", async () => {
    const interactor = new LibrarySearchInteractor(mockRepo);
    const results = await interactor.execute({ query: "Walter Gropius" });

    expect(results).toHaveLength(1);
    expect(results[0].relevance).toBe("high");
    expect(results[0].chapterTitle).toBe("Bauhaus History");
  });

  it("should find results with term matches", async () => {
    const interactor = new LibrarySearchInteractor(mockRepo);
    const results = await interactor.execute({ query: "functional" });

    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("should return empty array for very short queries", async () => {
    const interactor = new LibrarySearchInteractor(mockRepo);
    const results = await interactor.execute({ query: "ab" });

    expect(results).toHaveLength(0);
  });

  it("should sort results by score", async () => {
    const multiChapters: Chapter[] = [
      ...mockChapters,
      new Chapter(
        "book-1",
        "ch-2",
        "Other stuff",
        "Just a mention of Bauhaus here.",
        [],
        [],
        []
      ),
    ];
    const repoWithMulti: BookRepository = {
      ...mockRepo,
      getAllChapters: vi.fn().mockResolvedValue(multiChapters),
    };
    const interactor = new LibrarySearchInteractor(repoWithMulti);
    const results = await interactor.execute({ query: "Bauhaus" });

    expect(results).toHaveLength(2);
    expect(results[0].chapterSlug).toBe("ch-1"); // higher score due to title match
    expect(results[1].chapterSlug).toBe("ch-2");
  });
});
