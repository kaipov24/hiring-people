import { Router } from "express";
import mongoose from "mongoose";

import { getStorageDriver } from "../config/storage.js";

const router = Router();

const mongoState = () => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] ?? "unknown";
};

router.get("/", (_req, res) => {
  res.status(200).json({
    service: "inclusive-hire-api",
    status: "ok"
  });
});

router.get("/ready", async (_req, res) => {
  const database = mongoState();
  const ready = database === "connected";

  res.status(ready ? 200 : 503).json({
    service: "inclusive-hire-api",
    status: ready ? "ready" : "not_ready",
    checks: {
      database,
      storage: getStorageDriver()
    },
    uptimeSeconds: Math.round(process.uptime())
  });
});

export default router;
