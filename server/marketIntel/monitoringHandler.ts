import type { RequestHandler } from "express";
import { sdk } from "../_core/sdk";
import { runMonitoredScan } from "./monitoring";

export const marketMonitorHandler: RequestHandler = async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "Scheduled-task authentication is required." });
    const result = await runMonitoredScan(user.taskUid);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[Monitoring] Scheduled refresh failed", error);
    return res.status(500).json({ error: "Scheduled market refresh failed." });
  }
};
