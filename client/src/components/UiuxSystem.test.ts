import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("shared UI/UX system", () => {
  it("keeps navigation scroll-safe and exposes the current workspace in the compact header", () => {
    expect(layout).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(layout).toContain("activeDestination?.label");
    expect(layout).toContain('aria-label="Open workspace navigation"');
  });

  it("applies compact operational headers and reduced mobile density across routed workspaces", () => {
    expect(styles).toContain("Shared workspace density");
    expect(styles).toContain(".app-workspace > div > section:first-child h1.display-serif");
    expect(styles).toContain("-webkit-line-clamp: 2");
    expect(styles).toContain(".sidebar-narrative { display: none; }");
  });
});
