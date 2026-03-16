import type { MentionItem } from "../../core/entities/mentions";

/**
 * Strategy Interface for Mention Rendering and Interaction
 */
export interface MentionStrategy {
  canHandle(item: MentionItem): boolean;
  getIcon(): string;
  renderDescription(item: MentionItem): React.ReactNode;
}

export class PractitionerMentionStrategy implements MentionStrategy {
  canHandle(item: MentionItem) { return item.category === "practitioner"; }
  getIcon() { return "👤"; }
  renderDescription(item: MentionItem) {
    return (
      <span className="flex items-center gap-1">
        <span className="opacity-100 font-bold text-accent">Practitioner</span>
        {item.description && <span className="opacity-60">• {item.description}</span>}
      </span>
    );
  }
}

export class ChapterMentionStrategy implements MentionStrategy {
  canHandle(item: MentionItem) { return item.category === "chapter"; }
  getIcon() { return "📖"; }
  renderDescription(item: MentionItem) {
    return (
      <span className="flex items-center gap-1">
        <span className="opacity-100 font-bold text-emerald-500">Chapter</span>
        {item.description && <span className="opacity-60">• {item.description}</span>}
      </span>
    );
  }
}

export class FrameworkMentionStrategy implements MentionStrategy {
  canHandle(item: MentionItem) { return item.category === "framework"; }
  getIcon() { return "🛠️"; }
  renderDescription(item: MentionItem) {
    return (
      <span className="flex items-center gap-1">
        <span className="opacity-100 font-bold text-amber-500">Framework</span>
        {item.description && <span className="opacity-60">• {item.description}</span>}
      </span>
    );
  }
}

export class MentionStrategyRegistry {
  constructor(private strategies: MentionStrategy[]) {}

  getStrategy(item: MentionItem): MentionStrategy | null {
    return this.strategies.find(s => s.canHandle(item)) || null;
  }
}
