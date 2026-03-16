"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { useRouter } from "next/navigation";

import type { Command } from "@/core/commands/Command";
import { NavigationCommand } from "@/core/commands/NavigationCommands";
import { ThemeCommand } from "@/core/commands/ThemeCommands";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { setTheme } = useTheme();
  const router = useRouter();

  // Listen for Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Defined dynamic command items using the Command Pattern
  const commands = useMemo<Command[]>(() => {
    const navigate = (path: string) => router.push(path);
    return [
      // Navigation
      new NavigationCommand("nav-home", "Home", "Navigation", navigate, "/"),
      new NavigationCommand("nav-books", "Library / Books", "Navigation", navigate, "/books"),
      new NavigationCommand("nav-dashboard", "Business Dashboard", "Navigation", navigate, "/dashboard"),

      // Themes
      new ThemeCommand("theme-bauhaus", "Set Theme: Bauhaus", "Themes", setTheme, "bauhaus"),
      new ThemeCommand("theme-swiss", "Set Theme: Swiss Grid", "Themes", setTheme, "swiss"),
      new ThemeCommand("theme-postmodern", "Set Theme: Postmodern", "Themes", setTheme, "postmodern"),
      new ThemeCommand("theme-skeuomorphic", "Set Theme: Skeuomorphic", "Themes", setTheme, "skeuomorphic"),
      new ThemeCommand("theme-fluid", "Set Theme: Modern Fluid", "Themes", setTheme, "fluid"),

      // Books (Shortcuts to main categories)
      new NavigationCommand("book-ux", "Book: UX Design", "Books", navigate, "/books/ux-design"),
      new NavigationCommand("book-ui", "Book: UI Design", "Books", navigate, "/books/ui-design"),
      new NavigationCommand("book-se", "Book: Software Engineering", "Books", navigate, "/books/software-engineering"),
      new NavigationCommand("book-pm", "Book: Product Management", "Books", navigate, "/books/product-management"),
      new NavigationCommand("book-marketing", "Book: Marketing & Branding", "Books", navigate, "/books/marketing-branding"),
      new NavigationCommand("book-data", "Book: Data Analytics", "Books", navigate, "/books/data-analytics"),
      new NavigationCommand("book-content", "Book: Content Strategy", "Books", navigate, "/books/content-strategy"),
      new NavigationCommand("book-access", "Book: Accessibility", "Books", navigate, "/books/accessibility"),
      new NavigationCommand("book-entre", "Book: Entrepreneurship", "Books", navigate, "/books/entrepreneurship"),
      new NavigationCommand("book-design", "Book: Design History", "Books", navigate, "/books/design-history"),
    ];
  }, [router, setTheme]);

  // Filtering logic
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase()),
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (prev) =>
          (prev - 1 + filteredCommands.length) % filteredCommands.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filteredCommands[activeIndex];
      if (cmd) {
        cmd.execute();
        setOpen(false);
        setQuery("");
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="glass-overlay fixed inset-0 z-100 animate-in fade-in duration-200" />
        <Dialog.Content
          className="fixed inset-0 z-101 flex items-start justify-center p-3 pt-[max(0.75rem,var(--safe-area-inset-top))] pb-[max(0.75rem,var(--safe-area-inset-bottom))] sm:p-6 sm:pt-[max(1.5rem,var(--safe-area-inset-top))] sm:pb-[max(1.5rem,var(--safe-area-inset-bottom))] outline-none"
          onKeyDown={handleKeyDown}
        >
          <div className="glass-surface flex w-full max-w-160 flex-col overflow-hidden rounded-[28px] border-theme shadow-[0_32px_90px_rgba(15,23,42,0.2)] animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-200">
            <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search commands, navigation shortcuts, and theme actions.
            </Dialog.Description>
            <div className="flex min-h-14 items-center gap-3 border-b border-border bg-surface/75 px-4 py-3 sm:px-5">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-40"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                placeholder="Search chapters, themes, or tools..."
                className="h-11 flex-1 bg-transparent border-none text-[15px] outline-none placeholder:opacity-40"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
              />
              <kbd className="hidden h-7 items-center gap-1 rounded border-theme bg-surface-muted px-2 font-mono text-[10px] font-medium opacity-60 sm:flex">
                ESC
              </kbd>
            </div>

            <div className="max-h-[min(24rem,calc(var(--viewport-block-size)-12rem))] overflow-y-auto p-2 sm:max-h-[min(28rem,calc(var(--viewport-block-size)-14rem))]">
              <div className="flex flex-col gap-1">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.execute();
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`focus-ring flex min-h-12 w-full items-center justify-between rounded-theme px-4 py-3 text-left transition-all duration-75 sm:min-h-13 ${
                        index === activeIndex
                          ? "accent-fill"
                          : "hover-surface"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{cmd.title}</span>
                        <span
                          className={`text-label opacity-60 ${index === activeIndex ? "text-current" : ""}`}
                        >
                          {cmd.category}
                        </span>
                      </div>
                      {index === activeIndex && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm opacity-50">
                      No results found for &ldquo;{query}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-surface/85 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-4 text-label font-semibold opacity-40">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded border border-current">
                    ↑↓
                  </kbd>{" "}
                  Navigate
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded border border-current">
                    Enter
                  </kbd>{" "}
                  Select
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
