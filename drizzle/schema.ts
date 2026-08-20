import { index, int, longtext, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: longtext("name"),
  email: varchar("email", { length: 320 }),
 loginMethod: varchar("loginMethod", { length: 64 }),
 role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  activeOrganizationId: varchar("activeOrganizationId", { length: 32 }),
 createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizations = mysqlTable(
  "organizations",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("organizations_owner_idx").on(table.ownerUserId)]
);

export const organizationMembers = mysqlTable(
  "organization_members",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "research_lead", "analyst", "viewer"]).default("analyst").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("organization_members_org_user_unique").on(table.organizationId, table.userId), index("organization_members_user_idx").on(table.userId)]
);

export const trackedIndustries = mysqlTable(
  "tracked_industries",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
   industrySlug: varchar("industrySlug", { length: 96 }).notNull(),
    industryName: varchar("industryName", { length: 120 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
   uniqueIndex("tracked_industries_user_slug_unique").on(table.userId, table.industrySlug),
   index("tracked_industries_user_idx").on(table.userId),
    index("tracked_industries_organization_idx").on(table.organizationId),
  ]
);

export const researchProjects = mysqlTable(
  "research_projects",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
   name: varchar("name", { length: 160 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
   uniqueIndex("research_projects_user_name_unique").on(table.userId, table.name),
   index("research_projects_user_idx").on(table.userId),
    index("research_projects_organization_idx").on(table.organizationId),
  ]
);

export const marketScans = mysqlTable(
  "market_scans",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
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
    index("market_scans_organization_created_idx").on(table.organizationId, table.createdAt),
  ]
);

export const researchArtifacts = mysqlTable(
  "research_artifacts",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
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
    index("research_artifacts_organization_idx").on(table.organizationId),
  ]
);

export const competitorProfiles = mysqlTable(
  "competitor_profiles",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
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
    index("competitor_profiles_organization_idx").on(table.organizationId),
  ]
);

export const researchNotes = mysqlTable(
  "research_notes",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
   scanId: varchar("scanId", { length: 32 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    content: longtext("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("research_notes_user_scan_idx").on(table.userId, table.scanId), index("research_notes_organization_idx").on(table.organizationId)],
);

export const chatMessages = mysqlTable(
  "chat_messages",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
   scanId: varchar("scanId", { length: 32 }).notNull(),
    channel: mysqlEnum("channel", ["general", "risk"]).default("general").notNull(),
    role: mysqlEnum("role", ["user", "assistant"]).notNull(),
    content: longtext("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("chat_messages_user_scan_created_idx").on(table.userId, table.scanId, table.createdAt), index("chat_messages_organization_idx").on(table.organizationId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MarketScan = typeof marketScans.$inferSelect;
