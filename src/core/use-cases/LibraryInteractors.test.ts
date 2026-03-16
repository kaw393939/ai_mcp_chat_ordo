import { describe, it, expect, vi } from "vitest";
import { PractitionerInteractor } from "./PractitionerInteractor";
import { ChecklistInteractor } from "./ChecklistInteractor";
import { BookSummaryInteractor } from "./BookSummaryInteractor";
import type { BookRepository } from "./BookRepository";
import { Chapter } from "../entities/library";

const mockChapters: Chapter[] = [
  new Chapter(
    "clean-code",
    "srp",
    "Single Responsibility",
    "Content...",
    ["Uncle Bob"],
    ["One reason to change"],
    ["Intro", "Rule"]
  ),
  new Chapter(
    "clean-code",
    "dip",
    "Dependency Inversion",
    "More Content...",
    ["Uncle Bob", "Martin Fowler"],
    ["Depend on abstractions"],
    ["Intro"]
  ),
];

const mockBooks = [
  { slug: "clean-code", title: "Clean Code", number: "1" }
];

const mockRepo: BookRepository = {
  getAllBooks: vi.fn().mockResolvedValue(mockBooks),
  getAllChapters: vi.fn().mockResolvedValue(mockChapters),
  getChaptersByBook: vi.fn(),
  getChapter: vi.fn(),
  getBook: vi.fn().mockResolvedValue(mockBooks[0]),
};

describe("Library Interactors", () => {
  it("PractitionerInteractor should aggregate practitioners correctly", async () => {
    const interactor = new PractitionerInteractor(mockRepo);
    const results = await interactor.execute({});
    
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("Uncle bob");
    expect(results[0].chapters).toHaveLength(2);
  });

  it("ChecklistInteractor should filter by book", async () => {
    const interactor = new ChecklistInteractor(mockRepo);
    const results = await interactor.execute({ bookSlug: "clean-code" });
    
    expect(results).toHaveLength(2);
    expect(results[0].items).toContain("One reason to change");
  });

  it("BookSummaryInteractor should provide counts", async () => {
    const interactor = new BookSummaryInteractor(mockRepo);
    const results = await interactor.execute();
    
    expect(results).toHaveLength(1);
    expect(results[0].chapterCount).toBe(2);
  });
});
