"use client";

import { useTheme, type Theme } from "./ThemeProvider";

const THEMES: { id: Theme; label: string }[] = [
  { id: "bauhaus", label: "Bauhaus (1919)" },
  { id: "swiss", label: "Swiss Grid (1950s)" },
  { id: "postmodern", label: "Postmodern (1990s)" },
  { id: "skeuomorphic", label: "Skeuomorphic (2000s)" },
  { id: "fluid", label: "Modern Fluid (Present)" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      <div className="text-label opacity-50">
        Temporal Interface
      </div>
      <div className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`
              rounded-md px-3 py-1.5 text-xs font-medium transition-all focus-ring
              ${
                theme === t.id
                  ? "accent-fill shadow-sm"
                  : "bg-surface-muted text-foreground opacity-70 hover:opacity-100 hover-surface"
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
