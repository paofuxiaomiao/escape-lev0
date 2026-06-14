import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("game.getVideoPair", () => {
  it("returns null pair when level does not exist", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getVideoPair({ levelNumber: 999 });

    expect(result).toHaveProperty("normal");
    expect(result).toHaveProperty("anomaly");
    expect(result).toHaveProperty("levelName");
    expect(result.levelName).toBe("");
  });

  it("returns empty array for getLevels when no levels seeded", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.getLevels();
    expect(Array.isArray(result)).toBe(true);
  });

  it("recordAttempt returns success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.game.recordAttempt({
      levelNumber: 5,
      correct: true,
    });

    expect(result).toEqual({ success: true, correct: true });
  });
});

describe("levels.seed", () => {
  it("requires admin authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.levels.seed()).rejects.toThrow();
  });

  it("succeeds with admin context", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.levels.seed();
    expect(result).toHaveProperty("success", true);
  });
});
