import { describe, expect, it } from "vitest";
import type { Server } from "http";
import { createManagedPreviewViteOptions } from "./vite";

describe("managed preview Vite options", () => {
  it("uses the supplied HTTP server and routes browser HMR through secure port 443", () => {
    const server = {} as Server;
    const options = createManagedPreviewViteOptions(server);

    expect(options).toMatchObject({
      middlewareMode: true,
      allowedHosts: true,
      hmr: { server, protocol: "wss", clientPort: 443 },
    });
  });
});
