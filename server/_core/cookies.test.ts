import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

describe("session cookie security", () => {
  it("uses an HTTP-only Lax cookie and recognizes HTTPS forwarded through the trusted proxy", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: { "x-forwarded-proto": "https" } } as never);
    expect(options).toMatchObject({ httpOnly: true, path: "/", sameSite: "lax", secure: true });
  });

  it("does not mark a local plain-HTTP session cookie as secure", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: {} } as never);
    expect(options.secure).toBe(false);
  });
});
