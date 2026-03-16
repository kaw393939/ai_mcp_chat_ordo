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
    if (this.bookCache.has(slug)) {
      return this.bookCache.get(slug) ?? null;
    }

    const book = await this.inner.getBook(slug);
    this.bookCache.set(slug, book);
    return book;
  }

  async getAllDocuments(): Promise<Book[]> {
    return this.getAllBooks();
  }

  async getDocument(slug: string): Promise<Book | null> {
    return this.getBook(slug);
  }

  async getChaptersByBook(bookSlug: string): Promise<Chapter[]> {
    if (this.chaptersByBookCache.has(bookSlug)) {
      return this.chaptersByBookCache.get(bookSlug) ?? [];
    }

    const chapters = await this.inner.getChaptersByBook(bookSlug);
    this.chaptersByBookCache.set(bookSlug, chapters);
    return chapters;
  }

  async getAllChapters(): Promise<Chapter[]> {
    if (!this.allChaptersCache) {
      this.allChaptersCache = await this.inner.getAllChapters();
    }
    return this.allChaptersCache;
  }

  async getSectionsByDocument(documentSlug: string): Promise<Chapter[]> {
    return this.getChaptersByBook(documentSlug);
  }

  async getAllSections(): Promise<Chapter[]> {
    return this.getAllChapters();
  }

  async getChapter(bookSlug: string, chapterSlug: string): Promise<Chapter> {
    const key = `${bookSlug}/${chapterSlug}`;
    if (this.chapterCache.has(key)) {
      const cached = this.chapterCache.get(key);
      if (cached) {
        return cached;
      }
    }

    const chapter = await this.inner.getChapter(bookSlug, chapterSlug);
    this.chapterCache.set(key, chapter);
    return chapter;
  }

  async getSection(documentSlug: string, sectionSlug: string): Promise<Chapter> {
    return this.getChapter(documentSlug, sectionSlug);
  }
}
