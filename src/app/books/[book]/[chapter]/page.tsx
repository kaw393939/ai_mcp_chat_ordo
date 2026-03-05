import { getChapterContent, getChapters, BOOKS } from "@/lib/book";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
    const params: { book: string; chapter: string }[] = [];
    for (const book of BOOKS) {
        const chapters = await getChapters(book.slug);
        for (const chapter of chapters) {
            params.push({ book: book.slug, chapter: chapter.slug });
        }
    }
    return params;
}

export default async function ChapterPage({
    params,
}: {
    params: Promise<{ book: string; chapter: string }>;
}) {
    const resolvedParams = await params;
    const content = await getChapterContent(resolvedParams.chapter, resolvedParams.book);

    if (!content) {
        notFound();
    }

    return (
        <article className="transition-all duration-300">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node, ...props }) => <h1 className="text-4xl sm:text-5xl font-bold mb-8 mt-8 tracking-tight" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl sm:text-3xl font-bold mb-4 mt-12 border-b border-theme border-color-theme pb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl sm:text-2xl font-bold mb-4 mt-8" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-6 leading-relaxed opacity-90 text-lg" {...props} />,
                    a: ({ node, ...props }) => <a className="text-accent-theme underline hover:opacity-80 transition-opacity font-medium" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-6 opacity-90 text-lg flex flex-col gap-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-6 opacity-90 text-lg flex flex-col gap-2" {...props} />,
                    li: ({ node, ...props }) => <li className="" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-accent-theme pl-6 italic opacity-80 my-8 text-xl" {...props} />,
                    img: ({ node, ...props }) => <img className="rounded-theme shadow-theme my-10 max-w-full border-theme border-color-theme" {...props} />,
                    pre: ({ node, ...props }) => <pre className="bg-zinc-950 border-theme border-color-theme text-zinc-100 p-6 rounded-theme overflow-x-auto mb-8 text-sm shadow-theme font-mono" {...props} />,
                    code: ({ node, inline, ...props }: any) => inline
                        ? <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-theme text-sm border-theme border-color-theme font-mono" {...props} />
                        : <code className="font-mono" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto mb-8"><table className="w-full text-sm border-collapse" {...props} /></div>,
                    th: ({ node, ...props }) => <th className="border border-theme border-color-theme px-4 py-2 text-left font-bold bg-[var(--foreground)]/5" {...props} />,
                    td: ({ node, ...props }) => <td className="border border-theme border-color-theme px-4 py-2" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </article>
    );
}
