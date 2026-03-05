import { BOOKS, getChapters } from "@/lib/book";
import Link from "next/link";

export const metadata = {
    title: "The Product Development Library",
    description: "A 10-book series on professional product development in the AI era.",
};

export default async function BooksIndex() {
    const booksWithChapters = await Promise.all(
        BOOKS.map(async (book) => {
            const chapters = await getChapters(book.slug);
            return { ...book, chapterCount: chapters.length };
        })
    );

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
            <div className="mx-auto max-w-4xl px-6 py-16">
                <header className="mb-16 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                        The Product Development Library
                    </h1>
                    <p className="text-lg opacity-70 max-w-2xl mx-auto">
                        Ten books covering the full product development lifecycle — from engineering
                        through design, UX, product management, accessibility, and beyond.
                    </p>
                </header>

                <div className="grid gap-4 sm:grid-cols-2">
                    {booksWithChapters.map((book) => (
                        <Link
                            key={book.slug}
                            href={`/books/${book.slug}`}
                            className="group block rounded-xl border border-[var(--foreground)]/10 p-6 transition-all duration-200 hover:border-[var(--foreground)]/25 hover:shadow-lg hover:shadow-[var(--foreground)]/5 hover:-translate-y-0.5"
                        >
                            <div className="flex items-start gap-4">
                                <span className="shrink-0 text-xs font-bold uppercase tracking-wider opacity-40 pt-1">
                                    {book.number}
                                </span>
                                <div>
                                    <h2 className="text-lg font-semibold group-hover:text-accent-theme transition-colors">
                                        {book.title}
                                    </h2>
                                    <p className="text-sm opacity-60 mt-1">
                                        {book.chapterCount} chapters
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <Link
                        href="/"
                        className="text-xs uppercase tracking-wider font-bold text-accent-theme hover:opacity-80 transition-opacity"
                    >
                        ← Back to Chat
                    </Link>
                </div>
            </div>
        </div>
    );
}
