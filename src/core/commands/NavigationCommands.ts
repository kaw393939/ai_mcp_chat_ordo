import type { Command } from "./Command";

/**
 * Concrete Command: Handles Navigation
 * Accepts a generic navigate callback so core stays framework-agnostic.
 */
export class NavigationCommand implements Command {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly category: string,
    private readonly navigate: (path: string) => void,
    private readonly path: string
  ) {}

  execute(): void {
    this.navigate(this.path);
  }
}
