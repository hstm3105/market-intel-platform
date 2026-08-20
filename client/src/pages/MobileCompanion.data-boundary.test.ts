import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileCompanionSource = readFileSync(resolve(process.cwd(), "client/src/pages/MobileCompanion.tsx"), "utf8");

describe("Mobile companion organization-private data boundary", () => {
  it("uses active-session scoped notifications, portfolio operations, and delivery overview APIs without an organization override", () => {
    expect(mobileCompanionSource).toContain("trpc.marketIntel.collaboration.notifications.useQuery(undefined, { enabled: Boolean(user) })");
    expect(mobileCompanionSource).toContain("trpc.marketIntel.portfolio.operations.useQuery(undefined, { enabled: Boolean(user) })");
    expect(mobileCompanionSource).toContain("trpc.marketIntel.delivery.overview.useQuery(undefined, { enabled: Boolean(user) })");
    expect(mobileCompanionSource).toContain("trpc.marketIntel.executive.overview.useQuery(undefined, { enabled: Boolean(user) })");
    expect(mobileCompanionSource).not.toMatch(/organizationId\s*:/);
  });

  it("keeps viewer-safe mobile data read-only and limits approvals to approved snapshot records", () => {
    expect(mobileCompanionSource).toContain("const markRead = trpc.marketIntel.collaboration.markNotificationRead.useMutation");
    expect(mobileCompanionSource).toContain("delivery.data?.snapshots");
    expect(mobileCompanionSource).not.toContain("createSnapshot.useMutation");
    expect(mobileCompanionSource).not.toContain("configureIntegration.useMutation");
  });
});
