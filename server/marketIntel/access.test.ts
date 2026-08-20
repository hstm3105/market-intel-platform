import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

describe("market intelligence access control", () => {
  it("rejects unauthenticated access to private workspace data", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.marketIntel.workspace()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a scan request that does not use the permitted industry catalog", async () => {
    const ctx: TrpcContext = {
      user: { id: 1, openId: "consultant", name: "Consultant", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.marketIntel.createScan({
      industrySlug: "unrecognized-market",
      scope: "Assess the strategic conditions in an unrecognized market category.",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
