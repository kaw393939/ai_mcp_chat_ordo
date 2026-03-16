import { describe, expect, it } from "vitest";
import { ChatPolicyInteractor } from "@/core/use-cases/ChatPolicyInteractor";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { getToolRegistry } from "@/lib/chat/tool-composition-root";
import { createAdminWebSearchTool } from "@/core/use-cases/tools/admin-web-search.tool";
import type { SystemPromptRepository } from "@/core/use-cases/SystemPromptRepository";

// Minimal in-memory stub that always returns null (forces fallback)
const nullRepo: SystemPromptRepository = {
  getActive: async () => null,
  listVersions: async () => [],
  getByVersion: async () => null,
  createVersion: async () => { throw new Error("not implemented"); },
  activate: async () => {},
};

describe("ChatPolicyInteractor", () => {
  const basePrompt = "You are an advisor.";
  const directives: Record<string, string> = {
    ANONYMOUS: "\nDEMO MODE",
    AUTHENTICATED: "\nregistered member",
    STAFF: "\nstaff member",
    ADMIN: "\nSYSTEM ADMINISTRATOR",
  };
  const repo = new DefaultingSystemPromptRepository(nullRepo, basePrompt, directives);
  const interactor = new ChatPolicyInteractor(repo);

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

describe("ToolRegistry RBAC", () => {
  const registry = getToolRegistry();

  it("ANONYMOUS gets exactly 6 tool schemas", () => {
    const schemas = registry.getSchemasForRole("ANONYMOUS");
    expect(schemas).toHaveLength(6);
    const names = schemas.map((s) => s.name);
    expect(names).toContain("calculator");
    expect(names).toContain("search_corpus");
    expect(names).toContain("get_corpus_summary");
    expect(names).toContain("set_theme");
    expect(names).toContain("navigate");
    expect(names).toContain("adjust_ui");
  });

  it("ANONYMOUS cannot execute restricted tools", () => {
    expect(registry.canExecute("get_section", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("get_checklist", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("generate_audio", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("generate_chart", "ANONYMOUS")).toBe(false);
    expect(registry.canExecute("list_practitioners", "ANONYMOUS")).toBe(false);
  });

  it("AUTHENTICATED gets all 12 tool schemas", () => {
    const schemas = registry.getSchemasForRole("AUTHENTICATED");
    expect(schemas).toHaveLength(12);
  });

  it("STAFF gets all 12 tool schemas", () => {
    const schemas = registry.getSchemasForRole("STAFF");
    expect(schemas).toHaveLength(12);
  });

  it("ADMIN gets 13 tool schemas (12 base + admin_web_search)", () => {
    const schemas = registry.getSchemasForRole("ADMIN");
    expect(schemas).toHaveLength(13);
    const names = schemas.map((s) => s.name);
    expect(names).toContain("admin_web_search");
  });

  it("ADMIN gets admin_web_search descriptor with correct RBAC", () => {
    const descriptor = createAdminWebSearchTool();
    expect(descriptor.name).toBe("admin_web_search");
    expect(descriptor.roles).toEqual(["ADMIN"]);
    expect(descriptor.category).toBe("content");
    expect(descriptor.schema.input_schema.required).toEqual(["query"]);
  });
});
