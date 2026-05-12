import type { Request, Response, NextFunction } from "express";
import { WebhookPayloadSchema } from "../types/webhook.js";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

/**
 * Validates:
 *  1. The shared secret matches
 *  2. The symbol is in the allowed list
 *  3. The JSON body conforms to the WebhookPayloadSchema (via Zod)
 */
export function validateWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const parseResult = WebhookPayloadSchema.safeParse(req.body);

  if (!parseResult.success) {
    logger.warn("Invalid webhook payload", { errors: parseResult.error.flatten() });
    res.status(400).json({ error: "Invalid payload", details: parseResult.error.flatten() });
    return;
  }

  const payload = parseResult.data;

  // 1 — secret check
  if (payload.secret !== config.webhookSecret) {
    logger.warn("Webhook secret mismatch", { ip: req.ip });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // 2 — symbol whitelist
  if (!config.allowedSymbols.includes(payload.symbol)) {
    logger.warn("Symbol not in whitelist", { symbol: payload.symbol });
    res.status(422).json({ error: `Symbol ${payload.symbol} is not allowed` });
    return;
  }

  // Attach validated payload to request for downstream use
  req.body = payload;
  next();
}
