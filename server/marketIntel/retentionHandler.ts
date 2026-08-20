import type { RequestHandler } from "express";
import { sdk } from "../_core/sdk";
import { runScheduledRetentionBatch } from "./governance";

export const retentionHandler: RequestHandler = async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "Scheduled-task authentication is required." });
    const results = await runScheduledRetentionBatch();
    return res.status(200).json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error("[Governance] Scheduled retention enforcement failed", error);
    return res.status(500).json({ error: "Scheduled retention enforcement failed.", timestamp: new Date().toISOString() });
  }
};
