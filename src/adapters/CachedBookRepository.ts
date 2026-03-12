import type { BookRepository } from "@/core/use-cases/BookRepository";
import type { Book, Chapter } from "@/core/entities/library";

export class CachedBookRepository implements BookRepository {
  private allBooksCache: Book[] | null = null;
  private allChaptersCache: Chapter[] | null = null;
  private bookCache = new Map<string, Book | null>();
  private chaptersByBookCache = new Map<string, Chapter[]>();
  private chapterCache = new Map<string, Chapter>();

  constructor(private readonly inner: BookRepository) {}

  clearCache(): void {
    this.allBooksCache = null;
    this.allChaptersCache = null;
    this.bookCache.clear();
    this.chaptersByBookCache.clear();
    this.chapterCache.clear();
  }

  async getAllBooks(): Promise<Book[]> {
    if (!this.allBooksCache) {
      this.allBooksCache = await this.inner.getAllBooks();
    }
    return this.allBooksCache;
  }

  async getBook(slug: string): Promise<Book | null> {
    if (!this.bookCache.has(slug)) {
      this.bookCache.set(slug, await this.inner.getBook(slug));
    }
    return this.bookCache.get(slug)!;
  }

  async getChaptersByBook(bookSlug: string): Promise<Chapter[]> {
    if (!this.chaptersByBookCache.has(bookSlug)) {
      this.chaptersByBookCache.set(bookSlug, await this.inner.getChaptersByBook(bookSlug));
    }
    return this.chaptersByBookCache.get(bookSlug)!;
  }

  async getAllChapters(): Promise<Chapter[]> {
    if (!this.allChaptersCache) {
      this.allChaptersCache = await this.inner.getAllChapters();
    }
    return this.allChaptersCache;
  }

  async getChapter(bookSlug: string, chapterSlug: string): Promise<Chapter> {
    const key = `${bookSlug}/${chapterSlug}`;
    if (!this.chapterCache.has(key)) {
      this.chapterCache.set(key, await this.inner.getChapter(bookSlug, chapterSlug));
    }
    return this.chapterCache.get(key)!;
  }
}
