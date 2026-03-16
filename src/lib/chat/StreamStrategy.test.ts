import { describe, it, expect, vi } from "vitest";
import { 
  StreamProcessor, 
  TextDeltaStrategy, 
  ToolCallStrategy 
} from "./StreamStrategy";
import type { StreamEvent } from "@/core/entities/chat-stream";

describe("StreamStrategy Processor", () => {
  it("should route text delta to dispatch", () => {
    const dispatch = vi.fn();
    const processor = new StreamProcessor([new TextDeltaStrategy()]);
    
    const event: StreamEvent = { type: "text", delta: "Hello" };
    processor.process(event, { dispatch, assistantIndex: 1 });
    
    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TEXT",
      index: 1,
      delta: "Hello"
    });
  });

  it("should route tool call to dispatch", () => {
    const dispatch = vi.fn();
    const processor = new StreamProcessor([new ToolCallStrategy()]);
    
    const event: StreamEvent = { type: "tool_call", name: "test", args: { x: 1 } };
    processor.process(event, { dispatch, assistantIndex: 1 });
    
    expect(dispatch).toHaveBeenCalledWith({
      type: "APPEND_TOOL_CALL",
      index: 1,
      name: "test",
      args: { x: 1 }
    });
  });
});
