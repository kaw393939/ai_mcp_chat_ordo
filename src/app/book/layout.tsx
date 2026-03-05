import Link from "next/link";

export default function BookLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] transition-colors duration-300">
            <div className="mx-auto max-w-3xl p-6 lg:p-12">
                <div className="mb-8 pb-4 border-b border-theme border-color-theme">
                    <Link
                        href="/books"
                        className="text-xs uppercase tracking-wider font-bold text-accent-theme"
                    >
                        ← View All Books
                    </Link>
                </div>
                {children}
            </div>
        </div>
    );
}
