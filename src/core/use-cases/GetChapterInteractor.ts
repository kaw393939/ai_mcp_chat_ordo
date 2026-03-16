import type { UseCase } from "../common/UseCase";
import type { BookRepository } from "./BookRepository";

export interface GetChapterRequest {
  bookSlug: string;
  chapterSlug: string;
}

export interface ChapterDetails {
  title: string;
  content: string;
  bookTitle: string;
}

export class GetChapterInteractor implements UseCase<GetChapterRequest, ChapterDetails | null> {
  constructor(private bookRepository: BookRepository) {}

  async execute(request: GetChapterRequest): Promise<ChapterDetails | null> {
    const chapter = await this.bookRepository.getChapter(
      request.bookSlug,
      request.chapterSlug,
    );
    if (!chapter) return null;

    const book = await this.bookRepository.getBook(request.bookSlug);

    return {
      title: chapter.title,
      content: chapter.content,
      bookTitle: book ? `${book.number}. ${book.title}` : "",
    };
  }
}
