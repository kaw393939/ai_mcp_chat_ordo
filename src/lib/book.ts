import fs from "fs/promises";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "docs");

/**
 * Book metadata — the 10-book series
 */
export interface BookMeta {
    slug: string;
    title: string;
    shortTitle: string;
    number: string;  // Roman numeral
    chaptersDir: string;
}

export interface ChapterMeta {
    slug: string;
    title: string;
    filename: string;
}

/**
 * All books in the series, in order.
 */
export const BOOKS: BookMeta[] = [
    {
        slug: "software-engineering",
        title: "Software Engineering",
        shortTitle: "Software Eng",
        number: "I",
        chaptersDir: "software-engineering-book/chapters",
    },
    {
        slug: "design-history",
        title: "Design History",
        shortTitle: "Design History",
        number: "II",
        chaptersDir: "design-book/chapters",
    },
    {
        slug: "ui-design",
        title: "UI Design",
        shortTitle: "UI Design",
        number: "III",
        chaptersDir: "ui-design-book/chapters",
    },
    {
        slug: "ux-design",
        title: "UX Design",
        shortTitle: "UX Design",
        number: "IV",
        chaptersDir: "ux-design-book/chapters",
    },
    {
        slug: "product-management",
        title: "Product Management",
        shortTitle: "Product Mgmt",
        number: "V",
        chaptersDir: "product-management-book/chapters",
    },
    {
        slug: "accessibility",
        title: "Accessibility",
        shortTitle: "Accessibility",
        number: "VI",
        chaptersDir: "accessibility-book/chapters",
    },
    {
        slug: "entrepreneurship",
        title: "Entrepreneurship",
        shortTitle: "Entrepreneurship",
        number: "VII",
        chaptersDir: "entrepreneurship-book/chapters",
    },
    {
        slug: "marketing-branding",
        title: "Marketing & Branding",
        shortTitle: "Marketing",
        number: "VIII",
        chaptersDir: "marketing-branding-book/chapters",
    },
    {
        slug: "content-strategy",
        title: "Content Strategy",
        shortTitle: "Content Strategy",
        number: "IX",
        chaptersDir: "content-strategy-book/chapters",
    },
    {
        slug: "data-analytics",
        title: "Data & Analytics",
        shortTitle: "Data & Analytics",
        number: "X",
        chaptersDir: "data-analytics-book/chapters",
    },
];

/**
 * Get a book by its slug.
 */
export function getBook(bookSlug: string): BookMeta | undefined {
    return BOOKS.find((b) => b.slug === bookSlug);
}

/**
 * Get chapters for a specific book, read from its chapters directory.
 */
export async function getChapters(bookSlug?: string): Promise<ChapterMeta[]> {
    // Default to design-history for backwards compatibility with the /book route
    const book = bookSlug ? getBook(bookSlug) : BOOKS[1];
    if (!book) return [];

    const chaptersDir = path.join(DOCS_DIR, book.chaptersDir);

    try {
        const files = await fs.readdir(chaptersDir);
        const markdownFiles = files.filter((f) => f.endsWith(".md")).sort();

        return Promise.all(
            markdownFiles.map(async (filename) => {
                const slug = filename.replace(/\.md$/, "");
                const content = await fs.readFile(
                    path.join(chaptersDir, filename),
                    "utf-8"
                );
                const match = content.match(/^#\s+(.*)/m);
                const title = match ? match[1] : slug;

                return { slug, title, filename };
            })
        );
    } catch {
        return [];
    }
}

/**
 * Get the content of a specific chapter in a specific book.
 */
export async function getChapterContent(
    chapterSlug: string,
    bookSlug?: string
): Promise<string | null> {
    const book = bookSlug ? getBook(bookSlug) : BOOKS[1];
    if (!book) return null;

    const chaptersDir = path.join(DOCS_DIR, book.chaptersDir);

    try {
        const content = await fs.readFile(
            path.join(chaptersDir, `${chapterSlug}.md`),
            "utf-8"
        );
        return content;
    } catch {
        return null;
    }
}
