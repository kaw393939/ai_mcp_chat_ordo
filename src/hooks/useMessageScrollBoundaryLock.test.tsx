import React, { useRef } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useMessageScrollBoundaryLock } from "@/hooks/useMessageScrollBoundaryLock";

function BoundaryLockHarness() {
  const ref = useRef<HTMLDivElement>(null);

  useMessageScrollBoundaryLock(ref, true);

  return (
    <div ref={ref} data-testid="viewport">
      <div data-testid="content">Messages</div>
      <button type="button">Ignore me</button>
    </div>
  );
}

function setScrollMetrics(
  element: HTMLElement,
  {
    scrollTop,
    scrollHeight = 600,
    clientHeight = 200,
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

function createWheelEvent(deltaY: number, target?: HTMLElement) {
  const event = new Event("wheel", {
    bubbles: true,
    cancelable: true,
  }) as WheelEvent;

  Object.defineProperty(event, "deltaY", {
    configurable: true,
    value: deltaY,
  });

  if (target) {
    Object.defineProperty(event, "target", {
      configurable: true,
      value: target,
    });
  }

  return event;
}

function createTouchEvent(type: string, clientY: number, target?: HTMLElement) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as TouchEvent;
  const touches = [{ clientY }];

  Object.defineProperty(event, "touches", {
    configurable: true,
    value: type === "touchend" ? [] : touches,
  });
  Object.defineProperty(event, "changedTouches", {
    configurable: true,
    value: touches,
  });

  if (target) {
    Object.defineProperty(event, "target", {
      configurable: true,
      value: target,
    });
  }

  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useMessageScrollBoundaryLock", () => {
  it("prevents upward wheel escape when the message viewport is already at the top", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 0 });

    const event = createWheelEvent(-48, viewport);
    viewport.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("prevents downward wheel escape when the message viewport is already at the bottom", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 400 });

    const event = createWheelEvent(48, viewport);
    viewport.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("allows wheel scrolling when the message viewport can still scroll internally", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 120 });

    const event = createWheelEvent(48, viewport);
    viewport.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores interactive descendants inside the viewport", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    const button = screen.getByRole("button", { name: "Ignore me" });
    setScrollMetrics(viewport, { scrollTop: 0 });

    const event = createWheelEvent(-48, button);
    button.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents touchmove escape at the top boundary", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 0 });

    viewport.dispatchEvent(createTouchEvent("touchstart", 100, viewport));
    const moveEvent = createTouchEvent("touchmove", 120, viewport);
    viewport.dispatchEvent(moveEvent);

    expect(moveEvent.defaultPrevented).toBe(true);
  });

  it("prevents touchmove escape at the bottom boundary", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    setScrollMetrics(viewport, { scrollTop: 400 });

    viewport.dispatchEvent(createTouchEvent("touchstart", 100, viewport));
    const moveEvent = createTouchEvent("touchmove", 80, viewport);
    viewport.dispatchEvent(moveEvent);

    expect(moveEvent.defaultPrevented).toBe(true);
  });

  it("does not intercept keyboard events", () => {
    render(<BoundaryLockHarness />);

    const viewport = screen.getByTestId("viewport");
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowDown",
    });

    viewport.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});