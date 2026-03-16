import type { UseCase } from "../common/UseCase";
import type { BookRepository } from "./BookRepository";

export interface BookSummary {
  number: string;
  title: string;
  slug: string;
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
      const bookChapters = chapters.filter((c) => c.bookSlug === book.slug);
      return {
        number: book.number,
        title: book.title,
        slug: book.slug,
        chapterCount: bookChapters.length,
        chapters: bookChapters.map((c) => c.title),
        chapterSlugs: bookChapters.map((c) => c.chapterSlug),
      };
    });
  }
}
