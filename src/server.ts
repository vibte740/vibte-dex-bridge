import express from "express";
import helmet from "helmet";
import webhookRouter from "./routes/webhook.js";
import { logger } from "./utils/logger.js";

export function createServer(): express.Express {
  const app = express();

  // ── Global security headers ────────────────────────────────────────────────
  app.use(helmet());

  // ── Only accept JSON ───────────────────────────────────────────────────────
  app.use(express.json({ limit: "64kb" }));

  // ── Health probe (used by Docker HEALTHCHECK & load-balancers) ─────────────
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use("/api", webhookRouter);

  // ── 404 ────────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error("Unhandled error", { err });
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
