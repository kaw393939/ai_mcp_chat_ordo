import type { UseCase } from "../common/UseCase";
import type { BookRepository } from "./BookRepository";
import type { Checklist } from "../entities/library";

export interface ChecklistRequest {
  bookSlug?: string;
}

export class ChecklistInteractor implements UseCase<ChecklistRequest, Checklist[]> {
  constructor(private bookRepository: BookRepository) {}

  async execute(request: ChecklistRequest): Promise<Checklist[]> {
    const chapters = await this.bookRepository.getAllChapters();
    const books = await this.bookRepository.getAllBooks();

    const filteredChapters = request.bookSlug
      ? chapters.filter((c) => c.bookSlug === request.bookSlug)
      : chapters;

    return filteredChapters
      .filter((c) => c.checklistItems.length > 0)
      .map((c) => {
        const book = books.find((b) => b.slug === c.bookSlug);
        return {
          bookTitle: book ? `${book.number}. ${book.title}` : c.bookSlug,
          chapterTitle: c.title,
          items: c.checklistItems,
        };
      });
  }
}
