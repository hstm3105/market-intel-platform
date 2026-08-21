import { describe, expect, it } from "vitest";

describe("Google Workspace executive delivery credentials", () => {
  it("exchanges the protected refresh token for a server-side Google access token", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken!,
        grant_type: "refresh_token",
      }),
    });

    expect(response.ok).toBe(true);
    const token = await response.json() as { access_token?: string; expires_in?: number };
    expect(token.access_token).toMatch(/^ya29\./);
    expect(token.expires_in).toBeGreaterThan(0);

    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token.access_token!)}`);
    expect(tokenInfoResponse.ok).toBe(true);
    const tokenInfo = await tokenInfoResponse.json() as { scope?: string };
    const scopes = new Set((tokenInfo.scope ?? "").split(" "));
    for (const requiredScope of [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/spreadsheets",
    ]) expect(scopes.has(requiredScope), `Missing required OAuth scope: ${requiredScope}`).toBe(true);
  }, 20_000);
});
