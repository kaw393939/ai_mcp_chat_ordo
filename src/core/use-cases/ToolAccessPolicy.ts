import type { RoleName } from "../entities/user";

const ANONYMOUS_TOOL_WHITELIST: readonly string[] = [
  "calculator",
  "search_books",
  "get_book_summary",
  "set_theme",
  "navigate",
  "adjust_ui",
];

export function getToolNamesForRole(role: RoleName): string[] | "ALL" {
  if (role === "ANONYMOUS") return [...ANONYMOUS_TOOL_WHITELIST];
  return "ALL";
}
