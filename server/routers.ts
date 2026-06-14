import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { levels, videos, gameRecords } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // 层级管理 (管理员)
  levels: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(levels).orderBy(levels.sortOrder);
    }),
    create: adminProcedure
      .input(z.object({
        levelNumber: z.number().min(1).max(5),
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(levels).values({
          levelNumber: input.levelNumber,
          name: input.name,
          description: input.description || null,
          sortOrder: 6 - input.levelNumber, // L5 first
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        const cleanData: Record<string, unknown> = {};
        if (updateData.name !== undefined) cleanData.name = updateData.name;
        if (updateData.description !== undefined) cleanData.description = updateData.description;
        if (updateData.enabled !== undefined) cleanData.enabled = updateData.enabled;
        await db.update(levels).set(cleanData).where(eq(levels.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(levels).where(eq(levels.id, input.id));
        return { success: true };
      }),
    seed: adminProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const defaultLevels = [
        { levelNumber: 5, name: "进门", description: "LEV0入口大门", sortOrder: 1 },
        { levelNumber: 4, name: "电梯", description: "通往地下的电梯", sortOrder: 2 },
        { levelNumber: 3, name: "进场签到", description: "签到登记处", sortOrder: 3 },
        { levelNumber: 2, name: "涂鸦", description: "墙壁涂鸦区域", sortOrder: 4 },
        { levelNumber: 1, name: "室内开发", description: "室内开发空间", sortOrder: 5 },
      ];
      for (const level of defaultLevels) {
        await db.insert(levels).values(level).onDuplicateKeyUpdate({ set: { name: level.name } });
      }
      return { success: true };
    }),
  }),

  // 视频管理 (管理员)
  videos: router({
    list: adminProcedure
      .input(z.object({ levelId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (input?.levelId) {
          return db.select().from(videos).where(eq(videos.levelId, input.levelId));
        }
        return db.select().from(videos);
      }),
    create: adminProcedure
      .input(z.object({
        levelId: z.number(),
        title: z.string(),
        videoUrl: z.string(),
        videoKey: z.string(),
        thumbnailUrl: z.string().optional(),
        isNormal: z.boolean(),
        anomalyDescription: z.string().optional(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(videos).values({
          levelId: input.levelId,
          title: input.title,
          videoUrl: input.videoUrl,
          videoKey: input.videoKey,
          thumbnailUrl: input.thumbnailUrl || null,
          isNormal: input.isNormal,
          anomalyDescription: input.anomalyDescription || null,
          duration: input.duration || null,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        isNormal: z.boolean().optional(),
        anomalyDescription: z.string().optional(),
        enabled: z.boolean().optional(),
        levelId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...updateData } = input;
        const cleanData: Record<string, unknown> = {};
        if (updateData.title !== undefined) cleanData.title = updateData.title;
        if (updateData.isNormal !== undefined) cleanData.isNormal = updateData.isNormal;
        if (updateData.anomalyDescription !== undefined) cleanData.anomalyDescription = updateData.anomalyDescription;
        if (updateData.enabled !== undefined) cleanData.enabled = updateData.enabled;
        if (updateData.levelId !== undefined) cleanData.levelId = updateData.levelId;
        await db.update(videos).set(cleanData).where(eq(videos.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(videos).where(eq(videos.id, input.id));
        return { success: true };
      }),
    // 上传视频文件
    upload: adminProcedure
      .input(z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `videos/${Date.now()}-${input.fileName}`;
        const { key, url } = await storagePut(fileKey, buffer, input.contentType);
        return { key, url };
      }),
  }),

  // 游戏API (公开)
  game: router({
    // 获取指定层级的视频对（一个正常+一个异常，随机选取）
    getVideoPair: publicProcedure
      .input(z.object({ levelNumber: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { normal: null, anomaly: null, levelName: "" };
        
        // 获取层级信息
        const levelResult = await db.select().from(levels)
          .where(eq(levels.levelNumber, input.levelNumber))
          .limit(1);
        if (levelResult.length === 0) return { normal: null, anomaly: null, levelName: "" };
        const level = levelResult[0];

        // 获取该层级所有启用的正常视频
        const normalVideos = await db.select().from(videos)
          .where(and(
            eq(videos.levelId, level.id),
            eq(videos.isNormal, true),
            eq(videos.enabled, true),
          ));

        // 获取该层级所有启用的异常视频
        const anomalyVideos = await db.select().from(videos)
          .where(and(
            eq(videos.levelId, level.id),
            eq(videos.isNormal, false),
            eq(videos.enabled, true),
          ));

        // 随机选一个
        const normal = normalVideos.length > 0
          ? normalVideos[Math.floor(Math.random() * normalVideos.length)]
          : null;
        const anomaly = anomalyVideos.length > 0
          ? anomalyVideos[Math.floor(Math.random() * anomalyVideos.length)]
          : null;

        return {
          normal: normal ? { id: normal.id, videoUrl: normal.videoUrl, title: normal.title } : null,
          anomaly: anomaly ? { id: anomaly.id, videoUrl: anomaly.videoUrl, title: anomaly.title } : null,
          levelName: level.name,
        };
      }),
    // 获取所有层级信息（游戏用）
    getLevels: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const result = await db.select().from(levels)
        .where(eq(levels.enabled, true))
        .orderBy(levels.sortOrder);
      return result.map(l => ({
        id: l.id,
        levelNumber: l.levelNumber,
        name: l.name,
        description: l.description,
      }));
    }),
    // 记录游戏结果
    recordAttempt: publicProcedure
      .input(z.object({
        levelNumber: z.number(),
        correct: z.boolean(),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 简单记录，不强制要求登录
        return { success: true, correct: input.correct };
      }),
  }),
});

export type AppRouter = typeof appRouter;
