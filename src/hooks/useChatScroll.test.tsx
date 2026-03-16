import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChatScroll } from "@/hooks/useChatScroll";

function setScrollMetrics(
  element: HTMLElement,
  {
    scrollTop,
    scrollHeight = 800,
    clientHeight = 300,
  }: { scrollTop: number; scrollHeight?: number; clientHeight?: number },
) {
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    writable: true,
    value: scrollTop,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
}

function ScrollHarness() {
  const [dep, setDep] = React.useState("initial");
  const { scrollRef, handleScroll, scrollToBottom, isAtBottom } = useChatScroll(dep);

  return (
    <div>
      <div ref={scrollRef} data-testid="viewport" onScroll={handleScroll} />
      <div data-testid="at-bottom">{String(isAtBottom)}</div>
      <button type="button" onClick={() => setDep((value) => `${value}-next`)}>
        update
      </button>
      <button type="button" onClick={() => scrollToBottom("auto")}>
        bottom
      </button>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatScroll", () => {
  it("auto-scrolls while pinned to the bottom", async () => {
    render(<ScrollHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 500 });
    const scrollToMock = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });

    fireEvent.click(screen.getByRole("button", { name: "update" }));

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({ top: 500, behavior: expect.any(String) });
    });
  });

  it("stops auto-scrolling after the user detaches from the bottom", async () => {
    render(<ScrollHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 500 });
    const scrollToMock = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });

    fireEvent.click(screen.getByRole("button", { name: "update" }));
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledTimes(1);
    });

    setScrollMetrics(viewport, { scrollTop: 120 });
    fireEvent.scroll(viewport);
    expect(screen.getByTestId("at-bottom")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "update" }));

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledTimes(1);
    });
  });

  it("re-pins when scrollToBottom is called explicitly", async () => {
    render(<ScrollHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 120 });
    const scrollToMock = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });

    fireEvent.scroll(viewport);
    fireEvent.click(screen.getByRole("button", { name: "bottom" }));

    expect(scrollToMock).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
    expect(screen.getByTestId("at-bottom")).toHaveTextContent("true");
  });
});