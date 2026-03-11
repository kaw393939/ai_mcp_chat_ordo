import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/config/env";
import { looksLikeMath, buildSystemPrompt } from "@/lib/chat/policy";
import {
  errorJson,
  runRouteTemplate,
  successText,
} from "@/lib/chat/http-facade";
import { runClaudeAgentLoopStream } from "@/lib/chat/anthropic-stream";
import { getToolsForRole } from "@/lib/chat/tools";
import { getSessionUser } from "@/lib/auth";
import type { RoleName } from "@/core/entities/user";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Formats for SSE
function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  return runRouteTemplate({
    route: "/api/chat/stream",
    request,
    execute: async (context) => {
      const apiKey = getAnthropicApiKey();
      const user = await getSessionUser();
      const role = user.roles[0] as RoleName;
      const systemPrompt = await buildSystemPrompt(role);
      const tools = getToolsForRole(role);

      const body = (await request.json()) as { messages?: ChatMessage[] };
      const incomingMessages = body.messages ?? [];

      if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
        return errorJson(context, "messages must be a non-empty array.", 400);
      }

      const latestUserMessage = [...incomingMessages]
        .reverse()
        .find((message) => message.role === "user")?.content;

      if (!latestUserMessage) {
        return errorJson(context, "No user message found.", 400);
      }

      if (looksLikeMath(latestUserMessage)) {
        const mathResponse = await fetch(new URL("/api/chat", request.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ messages: incomingMessages }),
        });

        const mathPayload = (await mathResponse.json()) as {
          reply?: string;
          error?: string;
        };
        if (!mathResponse.ok) {
          return errorJson(
            context,
            mathPayload.error || "Math request failed.",
            500,
          );
        }

        return successText(context, mathPayload.reply || "");
      }

      const encoder = new TextEncoder();
      const streamAbortController = new AbortController();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            await runClaudeAgentLoopStream({
              apiKey,
              messages: incomingMessages,
              signal: streamAbortController.signal,
              systemPrompt,
              tools,
              role,
              callbacks: {
                onDelta(text) {
                  controller.enqueue(encoder.encode(sseChunk({ delta: text })));
                },
                onToolCall(name, args) {
                  controller.enqueue(
                    encoder.encode(sseChunk({ tool_call: { name, args } })),
                  );
                },
                onToolResult(name, result) {
                  controller.enqueue(
                    encoder.encode(sseChunk({ tool_result: { name, result } })),
                  );
                },
              },
            });

            controller.close();
          } catch (err) {
            console.error("[stream] error", err);
            controller.error(
              err instanceof Error ? err : new Error(String(err)),
            );
          }
        },
        cancel() {
          streamAbortController.abort();
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "x-request-id": context.requestId,
        },
      });
    },
  });
}
