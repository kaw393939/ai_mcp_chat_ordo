import { useEffect, useRef, useState, useCallback, type RefObject } from "react";

import {
  getAutoScrollBehavior,
  getUserScrollBehavior,
  scheduleAfterPaint,
  scrollElementTo,
} from "@/lib/ui/browserSupport";

export function useChatScroll<T>(dep: T): {
  scrollRef: RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
} {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Track whether the user deliberately scrolled away from the bottom
  const userScrolledUp = useRef(false);
  const prevScrollTop = useRef(0);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop } = scrollRef.current;
    const atBottom = checkIfAtBottom();

    // Detect deliberate upward scroll (scrollTop decreased by more than a small threshold)
    if (scrollTop < prevScrollTop.current - 10) {
      userScrolledUp.current = true;
    }

    // Reset when user reaches the bottom again
    if (atBottom) {
      userScrolledUp.current = false;
    }

    prevScrollTop.current = scrollTop;
    setIsAtBottom(atBottom);
  }, [checkIfAtBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = getUserScrollBehavior()) => {
    if (scrollRef.current) {
      scrollElementTo(scrollRef.current, scrollRef.current.scrollHeight, behavior);
      userScrolledUp.current = false;
      setIsAtBottom(true);
    }
  }, []);

  // Auto-scroll when content changes, unless the user deliberately scrolled up
  useEffect(() => {
    if (userScrolledUp.current) return;

    const cleanup = scheduleAfterPaint(() => {
      if (scrollRef.current) {
        scrollElementTo(
          scrollRef.current,
          scrollRef.current.scrollHeight,
          getAutoScrollBehavior(),
        );
      }
    });
    return cleanup;
  }, [dep]);

  return { scrollRef, isAtBottom, scrollToBottom, handleScroll };
}
