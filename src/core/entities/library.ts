import type {
  Contributor,
  CorpusSearchResult,
  Document,
  Supplement,
} from "./corpus";
import { Section } from "./corpus";

export type Book = Document;

export class Chapter extends Section {}
export type LibrarySearchResult = CorpusSearchResult;

export interface Practitioner {
  name: string;
  books: { slug: string; title: string; number: string }[];
  chapters: { slug: string; title: string }[];
}

export interface Checklist {
  bookTitle: string;
  chapterTitle: string;
  items: string[];
}

export type { Contributor, CorpusSearchResult, Document, Section, Supplement };
