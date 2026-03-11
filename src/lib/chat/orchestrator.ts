import type Anthropic from "@anthropic-ai/sdk";
import type { ChatProvider } from "@/lib/chat/anthropic-client";
import { createToolResults } from "@/lib/chat/tools";
import type { ToolChoice } from "@/lib/chat/types";
import type { RoleName } from "@/core/entities/user";

export async function orchestrateChatTurn({
  provider,
  conversation,
  toolChoice,
  role,
}: {
  provider: ChatProvider;
  conversation: Anthropic.MessageParam[];
  toolChoice: ToolChoice;
  role?: RoleName;
}) {
  let nextToolChoice = toolChoice;

  for (let step = 0; step < 6; step += 1) {
    const response = await provider.createMessage({
      messages: conversation,
      toolChoice: nextToolChoice,
    });

    nextToolChoice = { type: "auto" };

    const toolUses = response.content.filter(
      (block) => block.type === "tool_use",
    );
    const textReply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (toolUses.length === 0) {
      return textReply || "No response content returned.";
    }

    const assistantMessage: Anthropic.MessageParam = {
      role: "assistant",
      content: response.content,
    };
    conversation.push(assistantMessage);

    const toolResults = await createToolResults(toolUses, role);
    const toolResultMessage: Anthropic.MessageParam = {
      role: "user",
      content: toolResults,
    };
    conversation.push(toolResultMessage);
  }

  throw new Error("Exceeded tool-call safety limit.");
}
