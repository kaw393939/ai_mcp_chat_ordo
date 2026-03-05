import { redirect } from "next/navigation";

export default function OldChapterPage({ params }: { params: { chapter: string } }) {
    redirect(`/books/design-history/${params.chapter}`);
}
