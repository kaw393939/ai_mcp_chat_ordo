import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAutoScrollBehavior,
  getSafeAreaInsetVar,
  getSafeAreaPaddingValue,
  getUserScrollBehavior,
  getViewportBlockSizeValue,
  supportsBackdropBlur,
  supportsDynamicViewportUnits,
  supportsReducedMotion,
  supportsViewTransitions,
} from "@/lib/ui/browserSupport";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browserSupport", () => {
  it("returns false when view transitions are unavailable", () => {
    expect(supportsViewTransitions(null)).toBe(false);
  });

  it("returns true when view transitions are available", () => {
    const mockDocument = {
      startViewTransition: () => ({ finished: Promise.resolve() }),
    } as unknown as Pick<Document, "startViewTransition">;

    expect(supportsViewTransitions(mockDocument)).toBe(true);
  });

  it("detects backdrop blur through standard or webkit support", () => {
    const supports = vi.fn((query: string) => query === "-webkit-backdrop-filter: blur(1px)");

    expect(supportsBackdropBlur(supports)).toBe(true);
    expect(supports).toHaveBeenCalled();
  });

  it("detects dynamic viewport unit support", () => {
    const supports = vi.fn((query: string) => query === "height: 100dvh");

    expect(supportsDynamicViewportUnits(supports)).toBe(true);
    expect(getViewportBlockSizeValue(supports)).toBe("100dvh");
  });

  it("falls back to 100vh when dynamic viewport units are unavailable", () => {
    expect(getViewportBlockSizeValue(() => false)).toBe("100vh");
  });

  it("builds safe-area inset and padding expressions", () => {
    expect(getSafeAreaInsetVar("bottom")).toBe("env(safe-area-inset-bottom, 0px)");
    expect(getSafeAreaPaddingValue("bottom", "1rem")).toBe(
      "max(1rem, env(safe-area-inset-bottom, 0px))",
    );
  });

  it("returns motion preferences and scroll behaviors", () => {
    expect(supportsReducedMotion({ matches: true })).toBe(true);
    expect(supportsReducedMotion({ matches: false })).toBe(false);
    expect(getAutoScrollBehavior()).toBe("auto");
    expect(getUserScrollBehavior()).toBe("smooth");
  });
});