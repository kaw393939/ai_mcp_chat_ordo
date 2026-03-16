import { getDocuments, getCorpusSummaries } from "@/lib/corpus-library";
import Link from "next/link";

export const metadata = {
  title: "Corpus",
  description: "Browse the reusable corpus backing the product shell.",
};

export default async function CorpusIndex() {
  const [documents, summaries] = await Promise.all([getDocuments(), getCorpusSummaries()]);
  const documentsWithSections = documents.map((document) => {
    const summary = summaries.find((item) => item.slug === document.slug);
    return { ...document, sectionCount: summary?.sectionCount || 0 };
  });

  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground transition-colors duration-300">
      <div className="mx-auto max-w-4xl px-[var(--container-padding)] py-16">
        <header className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Corpus
          </h1>
          <p className="mx-auto max-w-2xl text-lg opacity-70">
            Browse the generalized document corpus that powers the current reference product.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {documentsWithSections.map((document) => (
            <Link
              key={document.slug}
              href={`/corpus/${document.slug}`}
              className="group block rounded-theme border-theme p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="flex items-start gap-4">
                <span className="shrink-0 pt-1 text-xs font-bold uppercase tracking-wider opacity-40">
                  {document.id}
                </span>
                <div>
                  <h2 className="text-lg font-semibold transition-colors group-hover:text-accent">
                    {document.title}
                  </h2>
                  <p className="mt-1 text-sm opacity-60">
                    {document.sectionCount} sections
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}