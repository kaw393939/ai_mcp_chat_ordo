import type { UseCase } from "../common/UseCase";
import type { BookRepository } from "./BookRepository";

export interface ChapterIndex {
  bookSlug: string;
  bookTitle: string;
  bookNumber: string;
  chapterSlug: string;
  chapterTitle: string;
  practitioners: string[];
  checklistItems: string[];
  headings: string[];
  contentPreview: string;
  filePath: string;
}

export class GetBookIndexInteractor implements UseCase<void, ChapterIndex[]> {
  constructor(private bookRepository: BookRepository) {}

  async execute(): Promise<ChapterIndex[]> {
    const books = await this.bookRepository.getAllBooks();
    const chapters = await this.bookRepository.getAllChapters();

    return chapters.map((chapter) => {
      const book = books.find((b) => b.slug === chapter.bookSlug);
      return {
        bookSlug: book?.slug || chapter.bookSlug,
        bookTitle: book?.title || "",
        bookNumber: book?.number || "",
        chapterSlug: chapter.chapterSlug,
        chapterTitle: chapter.title,
        practitioners: chapter.practitioners,
        checklistItems: chapter.checklistItems,
        headings: chapter.headings,
        contentPreview: chapter.content.slice(0, 300).replace(/\n/g, " ").trim(),
        filePath: "", // Deprecated field
      };
    });
  }
}
