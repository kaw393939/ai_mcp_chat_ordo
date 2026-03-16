import { getSectionFull, getCorpusSummaries } from "@/lib/corpus-library";
import { ResourceNotFoundError } from "@/core/entities/errors";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
  const summaries = await getCorpusSummaries();
  const params: { document: string; section: string }[] = [];
  for (const summary of summaries) {
    for (const sectionSlug of summary.sectionSlugs) {
      params.push({ document: summary.slug, section: sectionSlug });
    }
  }
  return params;
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ document: string; section: string }>;
}) {
  const resolvedParams = await params;
  let content: string;
  try {
    const result = await getSectionFull(
      resolvedParams.document,
      resolvedParams.section,
    );
    if (!result) {
      notFound();
    }
    content = result.content;
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <article className="transition-all duration-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _node, ...props }) => (
            <h1 className="mb-8 mt-8 text-4xl font-bold tracking-tight sm:text-5xl" {...props} />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2 className="mt-12 border-b border-theme pb-2 text-2xl font-bold sm:text-3xl" {...props} />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3 className="mb-4 mt-8 text-xl font-bold sm:text-2xl" {...props} />
          ),
          p: ({ node: _node, ...props }) => (
            <p className="mb-6 text-lg leading-relaxed opacity-90" {...props} />
          ),
          a: ({ node: _node, ...props }) => (
            <a className="font-medium text-accent underline transition-opacity hover:opacity-80" {...props} />
          ),
          ul: ({ node: _node, ...props }) => (
            <ul className="mb-6 flex list-disc flex-col gap-2 pl-6 text-lg opacity-90" {...props} />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol className="mb-6 flex list-decimal flex-col gap-2 pl-6 text-lg opacity-90" {...props} />
          ),
          li: ({ node: _node, ...props }) => <li {...props} />,
          blockquote: ({ node: _node, ...props }) => (
            <blockquote className="my-8 border-l-4 border-accent pl-6 text-xl italic opacity-80" {...props} />
          ),
          img: ({ node: _node, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={alt || ""} className="my-10 max-w-full rounded-theme border-theme shadow-theme" {...props} />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre className="code-chrome mb-8 overflow-x-auto rounded-theme border-theme p-6 font-mono text-sm shadow-theme" {...props} />
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ node: _node, inline, ...props }: any) =>
            inline ? (
              <code className="rounded-theme border-theme bg-surface-muted px-1.5 py-0.5 font-mono text-sm" {...props} />
            ) : (
              <code className="font-mono" {...props} />
            ),
          table: ({ node: _node, ...props }) => (
            <div className="mb-8 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: ({ node: _node, ...props }) => (
            <th className="border border-color-theme bg-surface-muted px-4 py-2 text-left font-bold" {...props} />
          ),
          td: ({ node: _node, ...props }) => (
            <td className="border border-color-theme px-4 py-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}