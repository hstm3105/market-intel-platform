import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { chatMessages, competitorProfiles, marketScans, organizationMembers, organizations, researchArtifacts, researchNotes, researchProjects, trackedIndustries, users } from "../../drizzle/schema";
import { getDb } from "../db";

export type OrganizationRole = "owner" | "admin" | "research_lead" | "analyst" | "viewer";
export const legacyResearchTableNames = ["trackedIndustries", "researchProjects", "marketScans", "researchArtifacts", "competitorProfiles", "researchNotes", "chatMessages"] as const;
export const legacyResearchTables = [
  { name: "trackedIndustries", table: trackedIndustries },
  { name: "researchProjects", table: researchProjects },
  { name: "marketScans", table: marketScans },
  { name: "researchArtifacts", table: researchArtifacts },
  { name: "competitorProfiles", table: competitorProfiles },
  { name: "researchNotes", table: researchNotes },
  { name: "chatMessages", table: chatMessages },
] as const;

export function defaultOrganizationName(userName?: string | null) {
  const firstName = (userName || "My").trim().split(" ")[0] || "My";
  return `${firstName} Intelligence`;
}

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("The organization database is currently unavailable.");
  return db;
};

async function assignLegacyResearch(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, organizationId: string) {
  await Promise.all(legacyResearchTables.map(({ table }) => db.update(table).set({ organizationId }).where(and(eq(table.userId, userId), isNull(table.organizationId)))));
}

export async function getActiveOrganization(userId: number, userName?: string | null) {
  const db = await requireDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Authenticated user was not found.");
  const memberships = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));

  if (!memberships.length) {
    const organizationId = nanoid();
    const name = defaultOrganizationName(userName || user.name);
    await db.insert(organizations).values({ id: organizationId, name, ownerUserId: userId });
    await db.insert(organizationMembers).values({ id: nanoid(), organizationId, userId, role: "owner" });
    await db.update(users).set({ activeOrganizationId: organizationId }).where(eq(users.id, userId));
    await assignLegacyResearch(db, userId, organizationId);
    return { organization: { id: organizationId, name, ownerUserId: userId }, membership: { organizationId, userId, role: "owner" as const } };
  }

  const membership = memberships.find(item => item.organizationId === user.activeOrganizationId) ?? memberships[0];
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, membership.organizationId)).limit(1);
  if (!organization) throw new Error("Active organization could not be found.");
  if (user.activeOrganizationId !== organization.id) await db.update(users).set({ activeOrganizationId: organization.id }).where(eq(users.id, userId));
  await assignLegacyResearch(db, userId, organization.id);
  return { organization, membership };
}

export async function listOrganizations(userId: number, userName?: string | null) {
  const active = await getActiveOrganization(userId, userName);
  const db = await requireDb();
  const memberships = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  const records = await Promise.all(memberships.map(async membership => ({ membership, organization: (await db.select().from(organizations).where(eq(organizations.id, membership.organizationId)).limit(1))[0] })));
  return { activeOrganizationId: active.organization.id, organizations: records.filter(record => record.organization).map(record => ({ ...record.organization!, role: record.membership.role })) };
}

export async function switchOrganization(userId: number, organizationId: string) {
  const db = await requireDb();
  const [membership] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))).limit(1);
  if (!membership) throw new Error("You are not a member of this organization.");
  await db.update(users).set({ activeOrganizationId: organizationId }).where(eq(users.id, userId));
  return { success: true };
}

export function canManageMembers(role: OrganizationRole) { return role === "owner" || role === "admin"; }
export function canCreateResearch(role: OrganizationRole) { return role !== "viewer"; }

export async function listMembers(organizationId: string) {
  const db = await requireDb();
  return db.select({ id: organizationMembers.id, userId: organizationMembers.userId, role: organizationMembers.role, createdAt: organizationMembers.createdAt, name: users.name, email: users.email }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(eq(organizationMembers.organizationId, organizationId));
}

export async function addExistingMember(organizationId: string, email: string, role: Exclude<OrganizationRole, "owner">) {
  const db = await requireDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.trim())).limit(1);
  if (!user) throw new Error("No signed-in platform user matches that email yet.");
  await db.insert(organizationMembers).values({ id: nanoid(), organizationId, userId: user.id, role }).onDuplicateKeyUpdate({ set: { role } });
  return { success: true };
}

export async function changeMemberRole(organizationId: string, memberUserId: number, role: Exclude<OrganizationRole, "owner">) {
  const db = await requireDb();
  await db.update(organizationMembers).set({ role }).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, memberUserId)));
  return { success: true };
}
