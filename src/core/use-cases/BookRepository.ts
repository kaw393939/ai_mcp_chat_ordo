import type {
  CorpusQuery,
  SectionQuery,
} from "./CorpusRepository";

export interface BookQuery {
  getAllBooks(): ReturnType<CorpusQuery["getAllDocuments"]>;
  getBook(slug: string): ReturnType<CorpusQuery["getDocument"]>;
}

export interface ChapterQuery {
  getChaptersByBook(bookSlug: string): ReturnType<SectionQuery["getSectionsByDocument"]>;
  getAllChapters(): ReturnType<SectionQuery["getAllSections"]>;
  getChapter(bookSlug: string, chapterSlug: string): ReturnType<SectionQuery["getSection"]>;
}

export interface BookRepository extends BookQuery, ChapterQuery {
  getAllDocuments?(): ReturnType<CorpusQuery["getAllDocuments"]>;
  getDocument?(slug: string): ReturnType<CorpusQuery["getDocument"]>;
  getSectionsByDocument?(documentSlug: string): ReturnType<SectionQuery["getSectionsByDocument"]>;
  getAllSections?(): ReturnType<SectionQuery["getAllSections"]>;
  getSection?(documentSlug: string, sectionSlug: string): ReturnType<SectionQuery["getSection"]>;
}

export type { CorpusQuery, SectionQuery };
