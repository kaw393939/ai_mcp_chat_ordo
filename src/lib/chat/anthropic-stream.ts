import Anthropic from "@anthropic-ai/sdk";
import { getModelCandidates } from "@/lib/chat/policy";
import { createToolResults } from "@/lib/chat/tools";
import type { RoleName } from "@/core/entities/user";

export interface StreamCallbacks {
  onDelta?: (text: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: unknown) => void;
}

export async function runClaudeAgentLoopStream({
  apiKey,
  messages,
  callbacks,
  maxToolRounds = 4,
  signal,
  systemPrompt,
  tools,
  role,
}: {
  apiKey: string;
  messages: Anthropic.MessageParam[];
  callbacks: StreamCallbacks;
  maxToolRounds?: number;
  signal?: AbortSignal;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  role?: RoleName;
}): Promise<void> {
  const models = getModelCandidates();
  const model = models[0]; // fallback, but ideally we check candidates

  // Simplistic fallback: just try the first configured model
  if (!model) {
    throw new Error("No valid Anthropic model configured.");
  }

  const client = new Anthropic({ apiKey });

  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description || "",
    input_schema: t.input_schema || { type: "object", properties: {} },
  }));

  let round = 0;
  // Make a working copy of the conversation
  const conversation = [...messages];

  while (round < maxToolRounds) {
    round++;
    if (signal?.aborted) break;

    const stream = client.messages.stream(
      {
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: conversation,
        tools: anthropicTools,
      },
      { signal },
    );

    stream.on("text", (text) => {
      callbacks.onDelta?.(text);
    });

    const response = await stream.finalMessage();

    // Check if finished or tool used
    if (response.stop_reason !== "tool_use") {
      break;
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) break;

    // Record the assistant's request to use tools
    conversation.push({ role: "assistant", content: response.content });

    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    // Execute tools and collect results
    // We execute them sequentially to capture output, or we can use the existing createToolResults
    const generatedResults = await createToolResults(toolUseBlocks, role);

    // Fire callbacks and format results
    for (let i = 0; i < toolUseBlocks.length; i++) {
      const use = toolUseBlocks[i];
      const res = generatedResults[i];

      const args = use.input as Record<string, unknown>;
      callbacks.onToolCall?.(use.name, args);

      // We know our createToolResults returns an array parallel to toolUses
      let finalResult: unknown = res.content;

      // Try parsing JSON if our tool outputted JSON, else just text
      if (typeof res.content === "string") {
        try {
          finalResult = JSON.parse(res.content);
        } catch {
          // Not JSON, that's fine
        }
      }

      callbacks.onToolResult?.(use.name, finalResult);
      toolResultContents.push(res);
    }

    conversation.push({ role: "user", content: toolResultContents });
  }
}
