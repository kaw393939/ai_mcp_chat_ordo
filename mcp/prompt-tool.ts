import type { SystemPromptRepository, SystemPrompt } from "@/core/use-cases/SystemPromptRepository";
import type { ConversationEventRecorder } from "@/core/use-cases/ConversationEventRecorder";

export interface PromptToolDeps {
  promptRepo: SystemPromptRepository;
  eventRecorder: ConversationEventRecorder;
  findActiveConversationIds: (role: string) => Promise<string[]>;
}

// 3.8 — prompt_list
export async function promptList(
  deps: PromptToolDeps,
  args: { role?: string; prompt_type?: string },
): Promise<unknown> {
  const { role, prompt_type } = args;
  const roles = role ? [role] : ["ALL", "ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"];
  const types = prompt_type ? [prompt_type] : ["base", "role_directive"];

  const results: Array<{
    role: string;
    prompt_type: string;
    version: number;
    is_active: boolean;
    created_at: string;
    created_by: string | null;
    notes: string;
    content_preview: string;
  }> = [];

  for (const r of roles) {
    for (const pt of types) {
      const versions = await deps.promptRepo.listVersions(r, pt);
      for (const v of versions) {
        results.push({
          role: v.role,
          prompt_type: v.promptType,
          version: v.version,
          is_active: v.isActive,
          created_at: v.createdAt,
          created_by: v.createdBy,
          notes: v.notes,
          content_preview: v.content.slice(0, 200),
        });
      }
    }
  }

  return { prompts: results, count: results.length };
}

// 3.9 — prompt_get
export async function promptGet(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; version?: number },
): Promise<unknown> {
  let prompt: SystemPrompt | null;
  if (args.version != null) {
    prompt = await deps.promptRepo.getByVersion(args.role, args.prompt_type, args.version);
  } else {
    prompt = await deps.promptRepo.getActive(args.role, args.prompt_type);
  }

  if (!prompt) {
    return { error: `No prompt found for role=${args.role}, type=${args.prompt_type}${args.version != null ? `, version=${args.version}` : ""}` };
  }

  return {
    role: prompt.role,
    prompt_type: prompt.promptType,
    version: prompt.version,
    content: prompt.content,
    is_active: prompt.isActive,
    created_at: prompt.createdAt,
    created_by: prompt.createdBy,
    notes: prompt.notes,
  };
}

// 3.10 — prompt_set
export async function promptSet(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; content: string; notes: string; created_by?: string },
): Promise<unknown> {
  const current = await deps.promptRepo.getActive(args.role, args.prompt_type);
  const oldVersion = current?.version ?? 0;

  const created = await deps.promptRepo.createVersion({
    role: args.role,
    promptType: args.prompt_type,
    content: args.content,
    createdBy: args.created_by ?? "admin",
    notes: args.notes,
  });

  await deps.promptRepo.activate(args.role, args.prompt_type, created.version);

  await emitPromptVersionChanged(deps, args.role, args.prompt_type, oldVersion, created.version);

  return { version: created.version, activated: true };
}

// 3.11 — prompt_rollback
export async function promptRollback(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; version: number },
): Promise<unknown> {
  const target = await deps.promptRepo.getByVersion(args.role, args.prompt_type, args.version);
  if (!target) {
    return { error: `Version ${args.version} not found for role=${args.role}, type=${args.prompt_type}` };
  }

  const current = await deps.promptRepo.getActive(args.role, args.prompt_type);
  const deactivatedVersion = current?.version ?? null;

  await deps.promptRepo.activate(args.role, args.prompt_type, args.version);

  await emitPromptVersionChanged(deps, args.role, args.prompt_type, deactivatedVersion ?? 0, args.version);

  return { activated_version: args.version, deactivated_version: deactivatedVersion };
}

/** Record prompt_version_changed on all active conversations for the affected role (§12.3, §13.7). */
async function emitPromptVersionChanged(
  deps: PromptToolDeps,
  role: string,
  promptType: string,
  oldVersion: number,
  newVersion: number,
): Promise<void> {
  const convIds = await deps.findActiveConversationIds(role);
  for (const convId of convIds) {
    await deps.eventRecorder.record(convId, "prompt_version_changed", {
      role,
      prompt_type: promptType,
      old_version: oldVersion,
      new_version: newVersion,
    });
  }
}

// 3.12 — prompt_diff (LCS-based line diff, no external deps)
export async function promptDiff(
  deps: PromptToolDeps,
  args: { role: string; prompt_type: string; version_a: number; version_b: number },
): Promise<unknown> {
  const a = await deps.promptRepo.getByVersion(args.role, args.prompt_type, args.version_a);
  const b = await deps.promptRepo.getByVersion(args.role, args.prompt_type, args.version_b);

  if (!a || !b) {
    return { error: "One or both versions not found." };
  }

  const diff = lineDiff(a.content, b.content);
  return {
    role: args.role,
    prompt_type: args.prompt_type,
    version_a: args.version_a,
    version_b: args.version_b,
    diff,
  };
}

/** Simple LCS-based line diff — no external dependencies. */
function lineDiff(textA: string, textB: string): string {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const m = linesA.length;
  const n = linesB.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        linesA[i - 1] === linesB[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce diff
  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      result.push(`  ${linesA[i - 1]}`);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push(`+ ${linesB[j - 1]}`);
      j--;
    } else {
      result.push(`- ${linesA[i - 1]}`);
      i--;
    }
  }

  return result.reverse().join("\n");
}
