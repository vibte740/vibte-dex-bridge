import dotenv from "dotenv";
import type { AppConfig, DexProvider } from "../types/webhook.js";

dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config: AppConfig = {
  port: parseInt(process.env["PORT"] ?? "8080", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  webhookSecret: requireEnv("WEBHOOK_SECRET"),
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  defaultDex: (process.env["DEFAULT_DEX"] ?? "hyperliquid") as DexProvider,
  riskPerTradePct: parseFloat(process.env["RISK_PER_TRADE_PCT"] ?? "1"),
  maxLeverage: parseInt(process.env["MAX_LEVERAGE"] ?? "5", 10),
  allowedSymbols: (process.env["ALLOWED_SYMBOLS"] ?? "BTC,ETH").split(","),
  privateKey: requireEnv("PRIVATE_KEY"),
};
