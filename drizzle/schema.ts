import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 游戏层级配置表
 * 5个层级: lev5(进门) -> lev4(电梯) -> lev3(签到) -> lev2(涂鸦) -> lev1(室内开发)
 */
export const levels = mysqlTable("levels", {
  id: int("id").autoincrement().primaryKey(),
  /** 层级编号 5-1 */
  levelNumber: int("levelNumber").notNull().unique(),
  /** 层级名称 */
  name: varchar("name", { length: 128 }).notNull(),
  /** 层级描述 */
  description: text("description"),
  /** 是否启用 */
  enabled: boolean("enabled").default(true).notNull(),
  /** 排序 */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Level = typeof levels.$inferSelect;
export type InsertLevel = typeof levels.$inferInsert;

/**
 * 视频素材表
 * 每个层级有多个视频，分为真实视频和异常视频
 */
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  /** 所属层级ID */
  levelId: int("levelId").notNull(),
  /** 视频标题/备注 */
  title: varchar("title", { length: 256 }).notNull(),
  /** 视频存储URL (S3) */
  videoUrl: text("videoUrl").notNull(),
  /** 视频存储key */
  videoKey: varchar("videoKey", { length: 512 }).notNull(),
  /** 缩略图URL */
  thumbnailUrl: text("thumbnailUrl"),
  /** 是否为真实视频(true=正常, false=异常/AI编辑) */
  isNormal: boolean("isNormal").default(false).notNull(),
  /** 异常描述（如果是异常视频，描述异常点） */
  anomalyDescription: text("anomalyDescription"),
  /** 是否启用 */
  enabled: boolean("enabled").default(true).notNull(),
  /** 视频时长(秒) */
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * 游戏记录表 - 记录玩家的游戏进度
 */
export const gameRecords = mysqlTable("gameRecords", {
  id: int("id").autoincrement().primaryKey(),
  /** 玩家用户ID (可选，匿名玩家为null) */
  userId: int("userId"),
  /** 当前层级 */
  currentLevel: int("currentLevel").default(5).notNull(),
  /** 总尝试次数 */
  totalAttempts: int("totalAttempts").default(0).notNull(),
  /** 正确次数 */
  correctCount: int("correctCount").default(0).notNull(),
  /** 是否通关 */
  completed: boolean("completed").default(false).notNull(),
  /** 通关用时(秒) */
  completionTime: int("completionTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameRecord = typeof gameRecords.$inferSelect;
export type InsertGameRecord = typeof gameRecords.$inferInsert;
