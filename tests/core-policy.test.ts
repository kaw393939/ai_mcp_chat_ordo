import { describe, expect, it } from "vitest";
import { ChatPolicyInteractor } from "@/core/use-cases/ChatPolicyInteractor";
import { getToolNamesForRole } from "@/core/use-cases/ToolAccessPolicy";

describe("ChatPolicyInteractor", () => {
  const basePrompt = "You are an advisor.";
  const interactor = new ChatPolicyInteractor(basePrompt);

  it("ANONYMOUS prompt includes DEMO mode framing", async () => {
    const prompt = await interactor.execute({ role: "ANONYMOUS" });
    expect(prompt).toContain(basePrompt);
    expect(prompt).toContain("DEMO MODE");
  });

  it("ADMIN prompt includes system administrator framing", async () => {
    const prompt = await interactor.execute({ role: "ADMIN" });
    expect(prompt).toContain(basePrompt);
    expect(prompt).toContain("SYSTEM ADMINISTRATOR");
  });

  it("AUTHENTICATED prompt includes registered member framing", async () => {
    const prompt = await interactor.execute({ role: "AUTHENTICATED" });
    expect(prompt).toContain("registered member");
  });

  it("STAFF prompt includes staff framing", async () => {
    const prompt = await interactor.execute({ role: "STAFF" });
    expect(prompt).toContain("staff member");
  });
});

describe("ToolAccessPolicy", () => {
  it("ANONYMOUS gets exactly 6 whitelisted tools", () => {
    const tools = getToolNamesForRole("ANONYMOUS");
    expect(tools).not.toBe("ALL");
    expect(tools).toHaveLength(6);
    expect(tools).toContain("calculator");
    expect(tools).toContain("search_books");
    expect(tools).toContain("get_book_summary");
    expect(tools).toContain("set_theme");
    expect(tools).toContain("navigate");
    expect(tools).toContain("adjust_ui");
  });

  it("ANONYMOUS does not get content or audio tools", () => {
    const tools = getToolNamesForRole("ANONYMOUS") as string[];
    expect(tools).not.toContain("get_chapter");
    expect(tools).not.toContain("get_checklist");
    expect(tools).not.toContain("generate_audio");
    expect(tools).not.toContain("generate_chart");
    expect(tools).not.toContain("list_practitioners");
  });

  it("AUTHENTICATED gets ALL tools", () => {
    expect(getToolNamesForRole("AUTHENTICATED")).toBe("ALL");
  });

  it("STAFF gets ALL tools", () => {
    expect(getToolNamesForRole("STAFF")).toBe("ALL");
  });

  it("ADMIN gets ALL tools", () => {
    expect(getToolNamesForRole("ADMIN")).toBe("ALL");
  });
});
