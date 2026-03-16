import { describe, it, expect } from "vitest";
import { buildContextWindow } from "./context-window";
import type { Message } from "@/core/entities/conversation";

function makeMessage(overrides: Partial<Message> = {}, index = 0): Message {
  return {
    id: `msg_${index}`,
    conversationId: "conv_1",
    role: "user",
    content: `Message ${index}`,
    parts: [{ type: "text", text: `Message ${index}` }],
    createdAt: new Date(2024, 0, 1, 0, index).toISOString(),
    tokenEstimate: 4,
    ...overrides,
  };
}

describe("buildContextWindow", () => {
  it("returns all non-system messages when no summary exists", () => {
    const messages = [
      makeMessage({ role: "user", content: "Hello" }, 0),
      makeMessage({ role: "assistant", content: "Hi" }, 1),
      makeMessage({ role: "user", content: "Question" }, 2),
    ];

    const { contextMessages, hasSummary, summaryText } = buildContextWindow(messages);
    expect(hasSummary).toBe(false);
    expect(summaryText).toBeNull();
    expect(contextMessages).toHaveLength(3);
    expect(contextMessages[0].content).toBe("Hello");
    expect(contextMessages[2].content).toBe("Question");
  });

  it("returns summary text separately and only post-summary messages", () => {
    const messages = [
      makeMessage({ role: "user", content: "Old msg 1" }, 0),
      makeMessage({ role: "assistant", content: "Old reply 1" }, 1),
      makeMessage(
        {
          role: "system",
          content: "Summary of discussion",
          parts: [{ type: "summary", text: "Summary of discussion", coversUpToMessageId: "msg_1" }],
        },
        2,
      ),
      makeMessage({ role: "user", content: "New msg" }, 3),
      makeMessage({ role: "assistant", content: "New reply" }, 4),
    ];

    const { contextMessages, hasSummary, summaryText } = buildContextWindow(messages);
    expect(hasSummary).toBe(true);
    expect(summaryText).toBe("Summary of discussion");
    expect(contextMessages).toHaveLength(2);
    expect(contextMessages[0].content).toBe("New msg");
    expect(contextMessages[1].content).toBe("New reply");
  });

  it("filters out system messages from post-summary window", () => {
    const messages = [
      makeMessage(
        {
          role: "system",
          content: "Old summary",
          parts: [{ type: "summary", text: "Old summary", coversUpToMessageId: "msg_0" }],
        },
        0,
      ),
      makeMessage({ role: "user", content: "After summary" }, 1),
      makeMessage({ role: "system", content: "Another system msg", parts: [] }, 2),
      makeMessage({ role: "assistant", content: "Reply" }, 3),
    ];

    const { contextMessages, hasSummary, summaryText } = buildContextWindow(messages);
    expect(hasSummary).toBe(true);
    expect(summaryText).toBe("Old summary");
    expect(contextMessages).toHaveLength(2);
    expect(contextMessages.every((m) => m.content !== "Another system msg")).toBe(true);
  });

  it("does not synthesize an assistant acknowledgement for summaries", () => {
    const messages = [
      makeMessage(
        {
          role: "system",
          content: "Summary of discussion",
          parts: [{ type: "summary", text: "Summary of discussion", coversUpToMessageId: "msg_0" }],
        },
        0,
      ),
      makeMessage({ role: "user", content: "Current question" }, 1),
    ];

    const { contextMessages } = buildContextWindow(messages);
    expect(
      contextMessages.some((message) =>
        message.content.includes("Understood. I have context from our earlier discussion."),
      ),
    ).toBe(false);
  });
});
