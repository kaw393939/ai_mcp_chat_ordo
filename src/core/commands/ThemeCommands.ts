import type { Command } from "./Command";
import type { Theme } from "../entities/theme";

/**
 * Concrete Command: Handles Theme Switching
 * References the core Theme type, not the React component.
 */
export class ThemeCommand implements Command {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly category: string,
    private readonly setTheme: (theme: Theme) => void,
    private readonly themeName: Theme
  ) {}

  execute(): void {
    this.setTheme(this.themeName);
  }
}
