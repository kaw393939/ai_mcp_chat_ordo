import { redirect } from "next/navigation";
import { getBook, getChapters, BOOKS } from "@/lib/book";

export async function generateStaticParams() {
    return BOOKS.map((book) => ({ book: book.slug }));
}

export default async function BookIndex({ params }: { params: Promise<{ book: string }> }) {
    const resolvedParams = await params;
    const book = getBook(resolvedParams.book);
    if (!book) {
        redirect("/books");
    }

    const chapters = await getChapters(book.slug);
    if (chapters.length > 0) {
        redirect(`/books/${book.slug}/${chapters[0].slug}`);
    }
    return <div>No chapters found.</div>;
}
