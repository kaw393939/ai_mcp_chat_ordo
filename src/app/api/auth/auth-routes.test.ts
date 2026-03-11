import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "@/lib/db/schema";

// Mock the db module to use an in-memory database
let testDb: ReturnType<typeof Database>;

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
}));

// Mock next/headers cookies
let cookieJar: Map<string, string>;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const val = cookieJar.get(name);
      return val ? { name, value: val } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

// Import route handlers AFTER mocks are set up
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/auth/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Auth API routes — full lifecycle", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    ensureSchema(testDb);
    cookieJar = new Map();
  });

  it("register → login → me → logout → me(401)", async () => {
    // 1. Register
    const regRes = await registerRoute(
      jsonRequest({ email: "test@example.com", password: "password123", name: "Test User" }),
    );
    expect(regRes.status).toBe(201);
    const regBody = await regRes.json();
    expect(regBody.user.email).toBe("test@example.com");
    expect(regBody.user.name).toBe("Test User");
    expect(regBody.user.roles).toContain("AUTHENTICATED");

    // Cookie should have been set
    const sessionToken = cookieJar.get("lms_session_token");
    expect(sessionToken).toBeTruthy();

    // 2. Validate session via /me
    const meRes = await meRoute();
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe("test@example.com");

    // 3. Logout
    const logoutRes = await logoutRoute();
    expect(logoutRes.status).toBe(200);
    expect(cookieJar.has("lms_session_token")).toBe(false);

    // 4. /me should now return 401
    const meRes2 = await meRoute();
    expect(meRes2.status).toBe(401);

    // 5. Login with the registered credentials
    cookieJar.clear();
    const loginRes = await loginRoute(
      jsonRequest({ email: "test@example.com", password: "password123" }),
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.email).toBe("test@example.com");
    expect(cookieJar.get("lms_session_token")).toBeTruthy();

    testDb.close();
  });

  it("register with invalid email returns 400", async () => {
    const res = await registerRoute(
      jsonRequest({ email: "not-an-email", password: "password123", name: "Test" }),
    );
    expect(res.status).toBe(400);

    testDb.close();
  });

  it("register with short password returns 400", async () => {
    const res = await registerRoute(
      jsonRequest({ email: "a@b.com", password: "short", name: "Test" }),
    );
    expect(res.status).toBe(400);

    testDb.close();
  });

  it("register with missing fields returns 400", async () => {
    const res = await registerRoute(
      jsonRequest({ email: "a@b.com" }),
    );
    expect(res.status).toBe(400);

    testDb.close();
  });

  it("duplicate registration returns 409", async () => {
    await registerRoute(
      jsonRequest({ email: "dup@test.com", password: "password123", name: "First" }),
    );
    const res = await registerRoute(
      jsonRequest({ email: "dup@test.com", password: "password456", name: "Second" }),
    );
    expect(res.status).toBe(409);

    testDb.close();
  });

  it("login with wrong password returns 401", async () => {
    await registerRoute(
      jsonRequest({ email: "user@test.com", password: "correct-pass", name: "User" }),
    );
    cookieJar.clear();
    const res = await loginRoute(
      jsonRequest({ email: "user@test.com", password: "wrong-pass" }),
    );
    expect(res.status).toBe(401);

    testDb.close();
  });

  it("login with nonexistent email returns 401", async () => {
    const res = await loginRoute(
      jsonRequest({ email: "nobody@test.com", password: "password123" }),
    );
    expect(res.status).toBe(401);

    testDb.close();
  });
});
