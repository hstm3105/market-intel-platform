import { describe, expect, it } from "vitest";
import { canCreateResearch, canManageMembers, defaultOrganizationName } from "./organization";

describe("enterprise organization role policy", () => {
  it("limits member management to owners and admins", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("research_lead")).toBe(false);
    expect(canManageMembers("analyst")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("prevents viewers from creating organization research", () => {
    expect(canCreateResearch("viewer")).toBe(false);
    expect(canCreateResearch("analyst")).toBe(true);
  });

  it("derives a stable default organization name during personal-workspace bootstrap", () => {
    expect(defaultOrganizationName("Harshit Sharma")).toBe("Harshit Intelligence");
    expect(defaultOrganizationName(null)).toBe("My Intelligence");
  });
});
