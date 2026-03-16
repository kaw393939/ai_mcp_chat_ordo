"use client";

import { useState, useCallback, type RefObject } from "react";
import type {
  MentionCategory} from "../core/entities/mentions";
import {
  PRACTITIONERS,
  CHAPTERS,
  FRAMEWORKS,
  type MentionItem
} from "../core/entities/mentions";

export type MentionTrigger = {
  char: string;
  category: MentionCategory;
};

export const TRIGGERS: MentionTrigger[] = [
  { char: "@", category: "practitioner" },
  { char: "[[", category: "chapter" },
  { char: "#", category: "framework" },
  { char: "/", category: "command" },
];

export function useMentions(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  options?: {
    findCommands?: (query: string) => MentionItem[];
  },
) {
  const [activeTrigger, setActiveTrigger] = useState<MentionTrigger | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [suggestions, setSuggestions] = useState<MentionItem[]>([]);

  const handleInput = useCallback(
    (text: string, cursorIndex: number) => {
      // Look back from cursor to find a trigger
      const textBeforeCursor = text.slice(0, cursorIndex);

      // Check multi-char triggers first
      let found = false;
      for (const trigger of TRIGGERS) {
        const { char } = trigger;
        const lastIndex = textBeforeCursor.lastIndexOf(char);

        if (lastIndex !== -1) {
          // Ensure no whitespace between trigger and cursor for active search
          const segment = textBeforeCursor.slice(lastIndex + char.length);
          if (!/\s/.test(segment)) {
            setActiveTrigger(trigger);
            setQuery(segment);

            // Filter suggestions
            let filtered: MentionItem[] = [];
            
            if (trigger.char === "/") {
              filtered = options?.findCommands?.(segment) ?? [];
            } else {
              const source =
                trigger.category === "practitioner"
                  ? PRACTITIONERS
                  : trigger.category === "chapter"
                    ? CHAPTERS
                    : FRAMEWORKS;

              filtered = source.filter((item) =>
                item.name.toLowerCase().includes(segment.toLowerCase()),
              );
            }
            setSuggestions(filtered);

            // Estimate menu position (simplistic approach for now)
            if (textareaRef.current) {
              const { offsetLeft, offsetTop } = textareaRef.current;
              // In a production app, we'd use a library like 'textarea-caret' to get precise coords
              setMenuPosition({ top: offsetTop - 40, left: offsetLeft + 20 });
            }

            found = true;
            break;
          }
        }
      }

      if (!found) {
        setActiveTrigger(null);
        setQuery("");
        setSuggestions([]);
      }
    },
    [options, textareaRef],
  );

  const insertMention = useCallback(
    (item: MentionItem) => {
      if (!textareaRef.current || !activeTrigger) return "";

      const text = textareaRef.current.value;
      const cursorIndex = textareaRef.current.selectionStart;
      const textBeforeCursor = text.slice(0, cursorIndex);
      const lastIndex = textBeforeCursor.lastIndexOf(activeTrigger.char);

      const newText =
        text.slice(0, lastIndex) +
        (activeTrigger.char === "[["
          ? `[[${item.name}]]`
          : `${activeTrigger.char}${item.name}`) +
        " " +
        text.slice(cursorIndex);

      setActiveTrigger(null);
      setQuery("");
      setSuggestions([]);

      return newText;
    },
    [activeTrigger, textareaRef],
  );

  return {
    activeTrigger,
    query,
    suggestions,
    menuPosition,
    handleInput,
    insertMention,
  };
}
