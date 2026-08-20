import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/pages/HomeCompact.tsx"), "utf8");

describe("compact home dashboard presentation", () => {
  it("limits first-glance research rows and progressively discloses secondary library context", () => {
    expect(source).toContain("data?.scans.slice(0, 3)");
    expect(source).toContain("<details className=\"group paper-card");
    expect(source).toContain("More context");
  });
});
