import { getCorpusIndex } from "@/lib/corpus-library";
import { notFound, redirect } from "next/navigation";

export default function OldChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  return (async () => {
    const resolvedParams = await params;
    const index = await getCorpusIndex();
    const match = index.find((entry) => entry.chapterSlug === resolvedParams.chapter);

    if (!match) {
      notFound();
    }

    redirect(`/corpus/${match.bookSlug}/${match.chapterSlug}`);
  })();
}
