import type { WebhookPayload } from "../types/webhook.js";
import { logger } from "../utils/logger.js";

/**
 * Validates that the incoming Supertrend signal is internally consistent
 * before forwarding to the order service.
 *
 * Rules:
 *  - BUY  signal → sl must be below price
 *  - SELL signal → sl must be above price
 *  - tp (if present) must be on the profit side
 */
export class SupertrendValidator {
  validate(payload: WebhookPayload): boolean {
    const { side, price, sl, tp } = payload;

    if (side === "close") {
      logger.debug("Close signal — skipping supertrend validation");
      return true;
    }

    // Price is required for validation
    if (price === undefined) {
      logger.warn("Price is required for Supertrend validation");
      return false;
    }

    if (side === "buy" && sl >= price) {
      logger.warn("BUY signal rejected: stop-loss is above entry price", { price, sl });
      return false;
    }

    if (side === "sell" && sl <= price) {
      logger.warn("SELL signal rejected: stop-loss is below entry price", { price, sl });
      return false;
    }

    if (tp !== undefined) {
      if (side === "buy" && tp <= price) {
        logger.warn("BUY signal rejected: take-profit is below entry price", { price, tp });
        return false;
      }
      if (side === "sell" && tp >= price) {
        logger.warn("SELL signal rejected: take-profit is above entry price", { price, tp });
        return false;
      }
    }

    logger.debug("Supertrend signal passed validation", { side, symbol: payload.symbol });
    return true;
  }
}
