import type { RequestHandler } from "express";
import { sdk } from "../_core/sdk";
import { runScheduledExecutiveBriefing } from "./executiveDistribution";

export const executiveBriefingHandler: RequestHandler = async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "Scheduled-task authentication is required." });
    const result = await runScheduledExecutiveBriefing(user.taskUid);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error("[Executive briefing] Scheduled generation failed", error);
    return res.status(500).json({ error: "Scheduled executive briefing generation failed.", timestamp: new Date().toISOString() });
  }
};
