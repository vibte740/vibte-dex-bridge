import { createServer } from "./server.js";
import { config } from "./utils/config.js";
import { logger } from "./utils/logger.js";

const app = createServer();

const server = app.listen(config.port, () => {
  logger.info(`🚀 Vibte DEX Bridge v2.0 running on port ${config.port}`, {
    env: config.nodeEnv,
    dex: config.defaultDex,
  });
});

// ── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string): void {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force-exit after 10 s if connections are still open
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { err });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});
