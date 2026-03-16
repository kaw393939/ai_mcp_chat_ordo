import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { NavigationCommand } from "@/core/commands/NavigationCommands";
import { ThemeCommand } from "@/core/commands/ThemeCommands";
import type { Command } from "@/core/commands/Command";
import type { MentionItem } from "@/core/entities/mentions";

class PlaceholderCommand implements Command {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly category: string,
  ) {}
  execute() { /* no-op placeholder */ }
}

function toMentionItem(command: Command): MentionItem {
  return {
    id: command.id,
    name: command.title,
    category: "command",
    description: command.category,
  };
}

export function useCommandRegistry() {
  const router = useRouter();
  const { setTheme } = useTheme();

  const commands = useMemo(() => {
    const navigate = (path: string) => router.push(path);

    return [
      new NavigationCommand("library", "Go to Library", "Navigation", navigate, "/books"),
      new NavigationCommand("training", "Go to Training", "Navigation", navigate, "/training"),
      new NavigationCommand("studio", "Go to Studio", "Navigation", navigate, "/studio"),
      new ThemeCommand("theme-fluid", "Set Theme: Fluid", "Themes", setTheme, "fluid"),
      new ThemeCommand("theme-swiss", "Set Theme: Swiss Grid", "Themes", setTheme, "swiss"),
      new ThemeCommand("theme-bauhaus", "Set Theme: Bauhaus", "Themes", setTheme, "bauhaus"),
      new ThemeCommand("theme-postmodern", "Set Theme: Postmodern", "Themes", setTheme, "postmodern"),
      new ThemeCommand("theme-skeuomorphic", "Set Theme: Skeuomorphic", "Themes", setTheme, "skeuomorphic"),
      new PlaceholderCommand("search", "Search Library", "Tools"),
      new PlaceholderCommand("checklists", "Get Checklists", "Tools"),
      new PlaceholderCommand("practitioners", "List Practitioners", "Tools"),
    ] satisfies Command[];
  }, [router, setTheme]);

  const executeCommand = useCallback(
    (commandId: string) => {
      const command = commands.find((candidate) => candidate.id === commandId);
      if (!command) {
        return false;
      }

      command.execute();
      return true;
    },
    [commands],
  );

  const findCommands = useCallback(
    (query: string) => {
      const normalizedQuery = query.toLowerCase();
      return commands
        .filter((command) =>
          command.title.toLowerCase().includes(normalizedQuery) ||
          command.category.toLowerCase().includes(normalizedQuery) ||
          command.id.toLowerCase().includes(normalizedQuery),
        )
        .map(toMentionItem);
    },
    [commands],
  );

  return {
    executeCommand,
    findCommands,
  };
}
