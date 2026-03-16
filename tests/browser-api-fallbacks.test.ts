import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAudioElement,
  prefersDarkColorScheme,
  scheduleAfterPaint,
  scrollElementIntoView,
  scrollElementTo,
  supportsIntersectionObserver,
  supportsReadableStreamReader,
} from "@/lib/ui/browserSupport";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("browser API fallbacks", () => {
  it("returns safe defaults when color scheme matching is unavailable", () => {
    expect(prefersDarkColorScheme(null)).toBe(false);
    expect(prefersDarkColorScheme(() => ({ matches: true }))).toBe(true);
  });

  it("detects readable stream reader and intersection observer support", () => {
    expect(supportsReadableStreamReader(null)).toBe(false);
    expect(
      supportsReadableStreamReader({
        getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) as ReadableStreamDefaultReader<Uint8Array>,
      }),
    ).toBe(true);

    expect(supportsIntersectionObserver(null)).toBe(false);
    expect(
      supportsIntersectionObserver({
        IntersectionObserver: class MockIntersectionObserver {
          disconnect() {}
          observe() {}
          takeRecords() { return []; }
          unobserve() {}
          root = null;
          rootMargin = "0px";
          thresholds = [0];
        } as unknown as typeof IntersectionObserver,
      }),
    ).toBe(true);
  });

  it("creates audio elements only when the constructor exists", () => {
    class MockAudio {
      constructor(public src?: string) {}
    }

    expect(createAudioElement("blob:test", MockAudio as unknown as typeof Audio)).toBeInstanceOf(MockAudio);
    expect(createAudioElement("blob:test", null)).toBeNull();
  });

  it("falls back to timeout scheduling when requestAnimationFrame is unavailable", () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const cleanup = scheduleAfterPaint(callback, null, null);
    vi.runAllTimers();

    expect(callback).toHaveBeenCalledTimes(1);
    cleanup();
    vi.useRealTimers();
  });

  it("falls back to direct scroll mutations when scroll helpers are unavailable", () => {
    const target = {
      scrollHeight: 640,
      scrollTop: 0,
    };

    scrollElementTo(target, target.scrollHeight);
    expect(target.scrollTop).toBe(640);

    const intoViewTarget = {
      scrollIntoView: vi.fn(),
    };
    scrollElementIntoView(intoViewTarget, "smooth", "center");
    expect(intoViewTarget.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });

    expect(() => scrollElementIntoView(null)).not.toThrow();
  });
});
