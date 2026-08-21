import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production request-boundary configuration", () => {
  it("limits structured request bodies and keeps binary data out of the main Express parser", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(source).toContain('express.json({ limit: "1mb" })');
    expect(source).toContain('express.urlencoded({ limit: "1mb", extended: true })');
    expect(source).not.toContain('limit: "50mb"');
    expect(source).toContain('app.disable("x-powered-by")');
    expect(source).toContain("app.use(helmet(");
    expect(source).toContain('app.use("/api/trpc", apiLimiter)');
  });
});
