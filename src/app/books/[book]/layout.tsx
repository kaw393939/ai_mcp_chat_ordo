import { getBook, getChapters, BOOKS } from "@/lib/book";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export async function generateStaticParams() {
    return BOOKS.map((book) => ({ book: book.slug }));
}

export default async function BookLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ book: string }>;
}) {
    const resolvedParams = await params;
    const book = getBook(resolvedParams.book);
    if (!book) notFound();

    const chapters = await getChapters(book.slug);

    return (
        <div className="flex min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-72 shrink-0 border-r border-theme border-color-theme p-6 hidden md:flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto">
                <div>
                    {/* Book selector */}
                    <Link
                        href="/books"
                        className="text-xs font-bold uppercase tracking-wider opacity-50 hover:opacity-100 transition-opacity"
                    >
                        ← All Books
                    </Link>
                    <h2 className="mt-3 mb-4 text-sm font-bold tracking-tight">
                        <span className="opacity-50 mr-1">{book.number}.</span> {book.title}
                    </h2>
                    <nav className="flex flex-col gap-3">
                        {chapters.map((chapter) => (
                            <Link
                                key={chapter.slug}
                                href={`/books/${book.slug}/${chapter.slug}`}
                                className="text-sm opacity-80 hover:opacity-100 hover:text-accent-theme transition-colors leading-snug"
                            >
                                {chapter.title}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto flex flex-col gap-6 pt-6 border-t border-theme border-color-theme">
                    <ThemeSwitcher />
                    <Link
                        href="/"
                        className="text-xs uppercase tracking-wider font-bold text-accent-theme hover:opacity-80 transition-opacity"
                    >
                        ← Back to Chat
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden p-6 lg:p-12 pb-24">
                {/* Mobile Nav */}
                <div className="md:hidden flex justify-between items-center mb-8 pb-4 border-b border-theme border-color-theme">
                    <div className="flex gap-4 items-center">
                        <Link
                            href="/books"
                            className="text-xs uppercase tracking-wider font-bold text-accent-theme"
                        >
                            ← Books
                        </Link>
                        <span className="text-xs opacity-50">{book.number}. {book.shortTitle}</span>
                    </div>
                    <div className="scale-75 origin-right">
                        <ThemeSwitcher />
                    </div>
                </div>

                <div className="mx-auto max-w-3xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
