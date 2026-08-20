import { boolean, index, int, longtext, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

export const knowledgeCollections = mysqlTable(
  "knowledge_collections",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: longtext("description").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("knowledge_collections_org_name_unique").on(table.organizationId, table.name), index("knowledge_collections_org_updated_idx").on(table.organizationId, table.updatedAt)]
);

export const knowledgeAssets = mysqlTable(
  "knowledge_assets",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    collectionId: varchar("collectionId", { length: 32 }),
    kind: mysqlEnum("kind", ["insight", "brief", "decision_note"]).notNull(),
    status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    content: longtext("content").notNull(),
    tagsJson: longtext("tagsJson").notNull(),
    scanIdsJson: longtext("scanIdsJson").notNull(),
    sourceRefsJson: longtext("sourceRefsJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("knowledge_assets_org_updated_idx").on(table.organizationId, table.updatedAt), index("knowledge_assets_collection_idx").on(table.collectionId, table.updatedAt), index("knowledge_assets_org_status_idx").on(table.organizationId, table.status)]
);

export const portfolioViews = mysqlTable(
  "portfolio_views",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    scanIdsJson: longtext("scanIdsJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("portfolio_views_org_name_unique").on(table.organizationId, table.name), index("portfolio_views_org_updated_idx").on(table.organizationId, table.updatedAt)]
);

export const portfolioMandates = mysqlTable(
  "portfolio_mandates",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    clientLabel: varchar("clientLabel", { length: 180 }).notNull(),
    description: longtext("description").notNull(),
    status: mysqlEnum("status", ["scoping", "active", "at_risk", "complete"]).notNull(),
    priority: mysqlEnum("priority", ["low", "standard", "high", "critical"]).notNull(),
    targetDate: timestamp("targetDate"),
    scanIdsJson: longtext("scanIdsJson").notNull(),
    knowledgeAssetIdsJson: longtext("knowledgeAssetIdsJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("portfolio_mandates_org_status_idx").on(table.organizationId, table.status, table.updatedAt), index("portfolio_mandates_org_owner_idx").on(table.organizationId, table.ownerUserId, table.updatedAt), index("portfolio_mandates_org_updated_idx").on(table.organizationId, table.updatedAt)]
);

export const portfolioWatchlists = mysqlTable(
  "portfolio_watchlists",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    mandateId: varchar("mandateId", { length: 32 }),
    createdByUserId: int("createdByUserId").notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    targetType: mysqlEnum("targetType", ["industry", "company", "risk_theme"]).notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    rationale: longtext("rationale").notNull(),
    status: mysqlEnum("status", ["watching", "escalated", "resolved"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("portfolio_watchlists_org_status_idx").on(table.organizationId, table.status, table.updatedAt), index("portfolio_watchlists_org_mandate_idx").on(table.organizationId, table.mandateId, table.updatedAt), index("portfolio_watchlists_org_owner_idx").on(table.organizationId, table.ownerUserId, table.updatedAt)]
);

export const organizationPortfolioPolicies = mysqlTable(
  "organization_portfolio_policies",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    maxActiveMandates: int("maxActiveMandates").default(30).notNull(),
    requireMandateOwner: boolean("requireMandateOwner").default(true).notNull(),
    requireReviewForCritical: boolean("requireReviewForCritical").default(true).notNull(),
    updatedByUserId: int("updatedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("organization_portfolio_policies_org_unique").on(table.organizationId)]
);

export const researchAgentRuns = mysqlTable(
  "research_agent_runs",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    scanIdsJson: longtext("scanIdsJson").notNull(),
    question: longtext("question").notNull(),
    model: varchar("model", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["completed", "failed"]).notNull(),
    synthesis: longtext("synthesis").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("research_agent_runs_org_created_idx").on(table.organizationId, table.createdAt), index("research_agent_runs_org_requester_idx").on(table.organizationId, table.requestedByUserId, table.createdAt)]
);

export const sourceEvidenceClaims = mysqlTable(
  "source_evidence_claims",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    agentRunId: varchar("agentRunId", { length: 32 }).notNull(),
    scanId: varchar("scanId", { length: 32 }).notNull(),
    claim: longtext("claim").notNull(),
    assessment: mysqlEnum("assessment", ["corroborated", "supported", "conflicted", "insufficient"]).notNull(),
    confidence: int("confidence").notNull(),
    sourceIdsJson: longtext("sourceIdsJson").notNull(),
    counterSourceIdsJson: longtext("counterSourceIdsJson").notNull(),
    rationale: longtext("rationale").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("source_evidence_claims_org_run_idx").on(table.organizationId, table.agentRunId, table.createdAt), index("source_evidence_claims_org_scan_idx").on(table.organizationId, table.scanId, table.createdAt), index("source_evidence_claims_org_assessment_idx").on(table.organizationId, table.assessment, table.createdAt)]
);

export const marketScans = mysqlTable(
  "market_scans",
  {
   id: varchar("id", { length: 32 }).primaryKey(),
   userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }),
    monitoredIndustryId: varchar("monitoredIndustryId", { length: 32 }),
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
    index("market_scans_monitor_idx").on(table.monitoredIndustryId, table.createdAt),
  ]
);

export const monitoredIndustries = mysqlTable(
  "monitored_industries",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    industrySlug: varchar("industrySlug", { length: 96 }).notNull(),
    industryName: varchar("industryName", { length: 120 }).notNull(),
    scope: longtext("scope").notNull(),
    cadence: mysqlEnum("cadence", ["weekly", "monthly"]).default("weekly").notNull(),
    cronExpression: varchar("cronExpression", { length: 64 }).notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    enabled: boolean("enabled").default(true).notNull(),
    riskThreshold: mysqlEnum("riskThreshold", ["all", "high"]).default("all").notNull(),
    lastScanId: varchar("lastScanId", { length: 32 }),
    lastRunAt: timestamp("lastRunAt"),
    nextRunAt: timestamp("nextRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("monitored_industries_org_user_slug_unique").on(table.organizationId, table.userId, table.industrySlug), index("monitored_industries_schedule_uid_idx").on(table.scheduleCronTaskUid), index("monitored_industries_org_enabled_idx").on(table.organizationId, table.enabled)]
);

export const monitoringPreferences = mysqlTable(
  "monitoring_preferences",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
    dailyDigestEnabled: boolean("dailyDigestEnabled").default(false).notNull(),
    minimumSeverity: mysqlEnum("minimumSeverity", ["all", "high"]).default("all").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("monitoring_preferences_org_user_unique").on(table.organizationId, table.userId)]
);

export const monitoringAlerts = mysqlTable(
  "monitoring_alerts",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    userId: int("userId").notNull(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    monitoredIndustryId: varchar("monitoredIndustryId", { length: 32 }).notNull(),
    scanId: varchar("scanId", { length: 32 }).notNull(),
    category: mysqlEnum("category", ["risk", "trend", "opportunity", "competitor"]).notNull(),
    severity: mysqlEnum("severity", ["high", "medium", "low"]).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    summary: longtext("summary").notNull(),
    evidenceJson: longtext("evidenceJson").notNull(),
    status: mysqlEnum("status", ["unread", "read"]).default("unread").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("monitoring_alerts_org_user_status_idx").on(table.organizationId, table.userId, table.status, table.createdAt), index("monitoring_alerts_monitor_idx").on(table.monitoredIndustryId, table.createdAt)]
);

export const organizationRetentionPolicies = mysqlTable(
  "organization_retention_policies",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    researchRetentionDays: int("researchRetentionDays").default(730).notNull(),
    knowledgeRetentionDays: int("knowledgeRetentionDays").default(1095).notNull(),
    auditRetentionDays: int("auditRetentionDays").default(1095).notNull(),
    legalHoldEnabled: boolean("legalHoldEnabled").default(false).notNull(),
    updatedByUserId: int("updatedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("organization_retention_policy_org_unique").on(table.organizationId)]
);

export const organizationAuditEvents = mysqlTable(
  "organization_audit_events",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    actorUserId: int("actorUserId").notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    resourceType: varchar("resourceType", { length: 64 }).notNull(),
    resourceId: varchar("resourceId", { length: 40 }),
    metadataJson: longtext("metadataJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("organization_audit_events_org_created_idx").on(table.organizationId, table.createdAt), index("organization_audit_events_org_actor_idx").on(table.organizationId, table.actorUserId, table.createdAt), index("organization_audit_events_org_type_idx").on(table.organizationId, table.eventType, table.createdAt)]
);

export const collaborationComments = mysqlTable(
  "collaboration_comments",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    targetType: mysqlEnum("targetType", ["market_scan", "knowledge_asset"]).notNull(),
    targetId: varchar("targetId", { length: 32 }).notNull(),
    authorUserId: int("authorUserId").notNull(),
    body: longtext("body").notNull(),
    mentionedUserIdsJson: longtext("mentionedUserIdsJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("collaboration_comments_org_target_created_idx").on(table.organizationId, table.targetType, table.targetId, table.createdAt), index("collaboration_comments_org_author_created_idx").on(table.organizationId, table.authorUserId, table.createdAt)]
);

export const collaborationReviews = mysqlTable(
  "collaboration_reviews",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    targetType: mysqlEnum("targetType", ["market_scan", "knowledge_asset"]).notNull(),
    targetId: varchar("targetId", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["draft", "in_review", "changes_requested", "approved"]).default("draft").notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    reviewerUserId: int("reviewerUserId"),
    decisionByUserId: int("decisionByUserId"),
    decisionNote: longtext("decisionNote").notNull(),
    dueAt: timestamp("dueAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("collaboration_reviews_org_target_unique").on(table.organizationId, table.targetType, table.targetId), index("collaboration_reviews_org_status_updated_idx").on(table.organizationId, table.status, table.updatedAt), index("collaboration_reviews_org_reviewer_status_idx").on(table.organizationId, table.reviewerUserId, table.status)]
);

export const collaborationNotifications = mysqlTable(
  "collaboration_notifications",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    organizationId: varchar("organizationId", { length: 32 }).notNull(),
    userId: int("userId").notNull(),
    actorUserId: int("actorUserId").notNull(),
    type: mysqlEnum("type", ["mention", "review_assigned", "review_decision"]).notNull(),
    targetType: mysqlEnum("targetType", ["market_scan", "knowledge_asset"]).notNull(),
    targetId: varchar("targetId", { length: 32 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    body: longtext("body").notNull(),
    status: mysqlEnum("status", ["unread", "read"]).default("unread").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    readAt: timestamp("readAt"),
  },
  table => [index("collaboration_notifications_org_user_status_idx").on(table.organizationId, table.userId, table.status, table.createdAt), index("collaboration_notifications_org_target_idx").on(table.organizationId, table.targetType, table.targetId, table.createdAt)]
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
