import { redirect } from "next/navigation";
import { getDocuments, getCorpusSummaries } from "@/lib/corpus-library";

export async function generateStaticParams() {
  const documents = await getDocuments();
  return documents.map((document) => ({ document: document.slug }));
}

export default async function CorpusDocumentPage({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const resolvedParams = await params;
  const documents = await getDocuments();
  const document = documents.find((item) => item.slug === resolvedParams.document);
  if (!document) {
    redirect("/corpus");
  }

  const summaries = await getCorpusSummaries();
  const summary = summaries.find((item) => item.slug === document.slug);

  if (summary?.sectionSlugs?.[0]) {
    redirect(`/corpus/${document.slug}/${summary.sectionSlugs[0]}`);
  }

  return <div>No sections found.</div>;
}