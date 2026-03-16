import type { StreamEvent } from "@/core/entities/chat-stream";

export interface StreamProcessingContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: (action: any) => void;
  assistantIndex: number;
}

export interface StreamEventStrategy {
  canHandle(event: StreamEvent): boolean;
  handle(event: StreamEvent, context: StreamProcessingContext): void;
}

export class TextDeltaStrategy implements StreamEventStrategy {
  canHandle(event: StreamEvent) {
    return event.type === "text";
  }
  handle(event: StreamEvent, { dispatch, assistantIndex }: StreamProcessingContext) {
    if (event.type === "text") {
      dispatch({ type: "APPEND_TEXT", index: assistantIndex, delta: event.delta });
    }
  }
}

export class ToolCallStrategy implements StreamEventStrategy {
  canHandle(event: StreamEvent) {
    return event.type === "tool_call";
  }
  handle(event: StreamEvent, { dispatch, assistantIndex }: StreamProcessingContext) {
    if (event.type === "tool_call") {
      dispatch({
        type: "APPEND_TOOL_CALL",
        index: assistantIndex,
        name: event.name,
        args: event.args,
      });
    }
  }
}

export class ToolResultStrategy implements StreamEventStrategy {
  canHandle(event: StreamEvent) {
    return event.type === "tool_result";
  }
  handle(event: StreamEvent, { dispatch, assistantIndex }: StreamProcessingContext) {
    if (event.type === "tool_result") {
      dispatch({
        type: "APPEND_TOOL_RESULT",
        index: assistantIndex,
        name: event.name,
        result: event.result,
      });
    }
  }
}

export class ErrorStrategy implements StreamEventStrategy {
  canHandle(event: StreamEvent) {
    return event.type === "error";
  }
  handle(event: StreamEvent, { dispatch, assistantIndex }: StreamProcessingContext) {
    if (event.type === "error") {
      dispatch({ type: "SET_ERROR", index: assistantIndex, error: event.message });
    }
  }
}

export class ConversationIdStrategy implements StreamEventStrategy {
  canHandle(event: StreamEvent) {
    return event.type === "conversation_id";
  }
  handle(event: StreamEvent, { dispatch }: StreamProcessingContext) {
    if (event.type === "conversation_id") {
      dispatch({ type: "SET_CONVERSATION_ID", conversationId: event.id });
    }
  }
}

export class StreamProcessor {
  private strategies: StreamEventStrategy[];

  constructor(strategies: StreamEventStrategy[]) {
    this.strategies = strategies;
  }

  process(event: StreamEvent, context: StreamProcessingContext) {
    const strategy = this.strategies.find((s) => s.canHandle(event));
    if (strategy) {
      strategy.handle(event, context);
    }
  }
}
