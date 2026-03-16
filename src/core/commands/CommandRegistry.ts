import type { Command } from "./Command";

/**
 * Singleton Registry for all system commands.
 * Powering the Slash Command system and Command Palette.
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, Command> = new Map();

  private constructor() {}

  public static getInstance(): CommandRegistry {
    if (!this.instance) {
      this.instance = new CommandRegistry();
    }
    return this.instance;
  }

  public register(command: Command): void {
    this.commands.set(command.id, command);
  }

  public getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  public getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  public findCommands(query: string): Command[] {
    const q = query.toLowerCase();
    return this.getAllCommands().filter(cmd => 
      cmd.title.toLowerCase().includes(q) || 
      cmd.category.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
    );
  }
}

export const commandRegistry = CommandRegistry.getInstance();
