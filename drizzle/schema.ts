import { index, int, longtext, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: longtext("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const trackedIndustries = mysqlTable(
  "tracked_industries",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    industrySlug: varchar("industrySlug", { length: 96 }).notNull(),
    industryName: varchar("industryName", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("tracked_industries_user_slug_unique").on(table.userId, table.industrySlug),
    index("tracked_industries_user_idx").on(table.userId),
  ]
);

export const researchProjects = mysqlTable(
  "research_projects",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("research_projects_user_name_unique").on(table.userId, table.name),
    index("research_projects_user_idx").on(table.userId),
  ]
);

export const marketScans = mysqlTable(
  "market_scans",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    industrySlug: varchar("industrySlug", { length: 96 }).notNull(),
    industryName: varchar("industryName", { length: 120 }).notNull(),
    projectId: varchar("projectId", { length: 32 }),
    projectName: varchar("projectName", { length: 160 }),
    scope: longtext("scope").notNull(),
    status: mysqlEnum("status", ["ready", "failed"]).default("ready").notNull(),
    executiveSummary: longtext("executiveSummary").notNull(),
    sourceJson: longtext("sourceJson").notNull(),
    analysisJson: longtext("analysisJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("market_scans_user_created_idx").on(table.userId, table.createdAt),
    index("market_scans_user_industry_idx").on(table.userId, table.industrySlug),
  ]
);

export const researchArtifacts = mysqlTable(
  "research_artifacts",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    scanId: varchar("scanId", { length: 32 }).notNull(),
    type: mysqlEnum("type", ["landscape", "brief"]).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    content: longtext("content").notNull(),
    dataJson: longtext("dataJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("research_artifacts_user_created_idx").on(table.userId, table.createdAt),
    index("research_artifacts_scan_idx").on(table.scanId),
  ]
);

export const competitorProfiles = mysqlTable(
  "competitor_profiles",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    scanId: varchar("scanId", { length: 32 }).notNull(),
    name: varchar("name", { length: 220 }).notNull(),
    segment: varchar("segment", { length: 220 }).notNull(),
    businessModel: longtext("businessModel").notNull(),
    positioning: longtext("positioning").notNull(),
    strengthsJson: longtext("strengthsJson").notNull(),
    weaknessesJson: longtext("weaknessesJson").notNull(),
    recentMovesJson: longtext("recentMovesJson").notNull(),
    strategicSignalsJson: longtext("strategicSignalsJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("competitor_profiles_scan_idx").on(table.scanId),
    index("competitor_profiles_user_idx").on(table.userId),
  ]
);

export const researchNotes = mysqlTable(
  "research_notes",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    scanId: varchar("scanId", { length: 32 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    content: longtext("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("research_notes_user_scan_idx").on(table.userId, table.scanId)],
);

export const chatMessages = mysqlTable(
  "chat_messages",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    scanId: varchar("scanId", { length: 32 }).notNull(),
    channel: mysqlEnum("channel", ["general", "risk"]).default("general").notNull(),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    content: longtext("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("chat_messages_user_scan_created_idx").on(table.userId, table.scanId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MarketScan = typeof marketScans.$inferSelect;
