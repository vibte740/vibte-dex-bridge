import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Redis } from "ioredis";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const redisClient = new Redis(config.redisUrl, {
  enableOfflineQueue: false,
  lazyConnect: true,
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error (rate-limiter)", { err });
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1_000,   // 1 minute
  max: 30,                 // max 30 signals per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (command: string, ...args: any[]) => redisClient.call(command, ...args) as Promise<number>,
  }),
  handler: (_req, res) => {
    logger.warn("Rate limit exceeded on /webhook");
    res.status(429).json({ error: "Too many requests" });
  },
});
