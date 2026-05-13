import { z } from "zod";

// ── Zod schema (runtime validation + type inference) ──────────────────────────

export const WebhookPayloadSchema = z.object({
  secret: z.string().min(1),
  side: z.enum(["buy", "sell", "close"]),
  symbol: z.string().min(1).transform((s) => s.toUpperCase()),
  price: z.number().positive().optional(),           // entry price (for limit orders) or reference price (for market orders)
  sl: z.number().positive(),                       // stop-loss price
  tp: z.number().positive().optional(),            // take-profit (optional)
  leverage: z.number().min(1).max(50).optional(),
  timestamp: z.number().int().optional(),
  orderType: z.enum(["market", "limit"]).optional(), // order type: market or limit (default: market)
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ── Order types ───────────────────────────────────────────────────────────────

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type DexProvider = "hyperliquid" | "dydx";

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  size: number;           // in USD notional
  price?: number;         // for limit orders
  stopLoss: number;
  takeProfit?: number;
  leverage: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  txHash?: string;
  filledPrice?: number;
  error?: string;
}

// ── Position ──────────────────────────────────────────────────────────────────

export interface Position {
  symbol: string;
  side: OrderSide;
  size: number;
  entryPrice: number;
  unrealisedPnl: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  nodeEnv: string;
  webhookSecret: string;
  redisUrl: string;
  defaultDex: DexProvider;
  riskPerTradePct: number;
  maxLeverage: number;
  allowedSymbols: string[];
  privateKey: string;
}
