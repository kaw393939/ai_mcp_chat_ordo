import type { UseCase } from "../common/UseCase";
import type { BookRepository } from "./BookRepository";
import type { CorpusSummary } from "./CorpusSummaryInteractor";

export interface BookSummary extends CorpusSummary {
  number: string;
  chapterCount: number;
  chapters: string[];
  chapterSlugs: string[];
}

export class BookSummaryInteractor implements UseCase<void, BookSummary[]> {
  constructor(private bookRepository: BookRepository) {}

  async execute(): Promise<BookSummary[]> {
    const books = await this.bookRepository.getAllBooks();
    const chapters = await this.bookRepository.getAllChapters();

    return books.map((book) => {
      const bookChapters = chapters.filter((chapter) => chapter.bookSlug === book.slug);
      return {
        id: book.id ?? book.number,
        number: book.number,
        title: book.title,
        slug: book.slug,
        sectionCount: bookChapters.length,
        sections: bookChapters.map((chapter) => chapter.title),
        sectionSlugs: bookChapters.map((chapter) => chapter.chapterSlug),
        chapterCount: bookChapters.length,
        chapters: bookChapters.map((chapter) => chapter.title),
        chapterSlugs: bookChapters.map((chapter) => chapter.chapterSlug),
      };
    });
  }
}
