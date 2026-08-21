import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PowerPoint export security boundary", () => {
  it("does not process user-supplied image bytes or remote image URLs in the export path", () => {
    const source = readFileSync(new URL("./reportExport.ts", import.meta.url), "utf8");
    expect(source).not.toContain("addImage(");
    expect(source).not.toContain("imageSizing");
    expect(source).not.toContain("fetch(");
  });
});
