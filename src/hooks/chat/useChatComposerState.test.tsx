import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { useChatComposerState } from "@/hooks/chat/useChatComposerState";

function Harness({ isSending = false }: { isSending?: boolean }) {
  const composer = useChatComposerState(isSending);

  return (
    <div>
      <div data-testid="can-send">{String(composer.canSend)}</div>
      <div data-testid="input-value">{composer.input}</div>
      <div data-testid="file-count">{composer.pendingFiles.length}</div>
      <input
        aria-label="draft"
        value={composer.input}
        onChange={(event) => composer.updateInput(event.target.value)}
      />
      <input
        aria-label="files"
        type="file"
        multiple
        onChange={composer.handleFileSelect}
      />
      <button type="button" onClick={() => composer.handleFileRemove(0)}>
        remove-first-file
      </button>
      <button type="button" onClick={() => composer.clearComposer()}>
        clear
      </button>
    </div>
  );
}

describe("useChatComposerState", () => {
  it("derives canSend from the local draft state", () => {
    render(<Harness />);

    expect(screen.getByTestId("can-send")).toHaveTextContent("false");

    fireEvent.change(screen.getByLabelText("draft"), {
      target: { value: "Plan the rollout" },
    });

    expect(screen.getByTestId("input-value")).toHaveTextContent("Plan the rollout");
    expect(screen.getByTestId("can-send")).toHaveTextContent("true");
  });

  it("allows file-only sends when files are queued", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("files"), {
      target: { files: [new File(["alpha"], "alpha.txt", { type: "text/plain" })] },
    });

    expect(screen.getByTestId("file-count")).toHaveTextContent("1");
    expect(screen.getByTestId("can-send")).toHaveTextContent("true");
  });

  it("tracks and removes pending files locally", () => {
    render(<Harness />);

    const fileInput = screen.getByLabelText("files");
    const firstFile = new File(["alpha"], "alpha.txt", { type: "text/plain" });
    const secondFile = new File(["beta"], "beta.txt", { type: "text/plain" });

    fireEvent.change(fileInput, {
      target: { files: [firstFile, secondFile] },
    });

    expect(screen.getByTestId("file-count")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "remove-first-file" }));

    expect(screen.getByTestId("file-count")).toHaveTextContent("1");
  });

  it("clears draft and files together", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("draft"), {
      target: { value: "Temporary draft" },
    });
    fireEvent.change(screen.getByLabelText("files"), {
      target: { files: [new File(["alpha"], "alpha.txt", { type: "text/plain" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "clear" }));

    expect(screen.getByTestId("input-value")).toHaveTextContent("");
    expect(screen.getByTestId("file-count")).toHaveTextContent("0");
    expect(screen.getByTestId("can-send")).toHaveTextContent("false");
  });
});