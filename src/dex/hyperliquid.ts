import type { OrderRequest, OrderResult } from "../types/webhook.js";
import { logger } from "../utils/logger.js";

/**
 * Hyperliquid REST/WebSocket client.
 * Replace the stub calls below with the official @hyperliquid/sdk once
 * the SDK stabilises, or use raw fetch against:
 *   https://api.hyperliquid.xyz/exchange
 *   https://api.hyperliquid.xyz/info
 */
export class HyperliquidClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env["HYPERLIQUID_TESTNET"] === "true"
        ? "https://api.hyperliquid-testnet.xyz"
        : "https://api.hyperliquid.xyz";

    logger.info("HyperliquidClient ready", { baseUrl: this.baseUrl });
  }

  async getAccountEquity(): Promise<number> {
    // TODO: implement signed /info request with wallet address derived from config.privateKey
    logger.debug("getAccountEquity() called (stub)");
    return 10_000; // placeholder
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    logger.info("Placing order on Hyperliquid", { order });
    // TODO: build + sign L1 action payload and POST to /exchange
    // Handle limit vs market orders
    if (order.type === "limit" && order.price !== undefined) {
      logger.info(`Placing limit order at price ${order.price}`);
    } else {
      logger.info("Placing market order");
    }
    return {
      success: true,
      orderId: `HL-${Date.now()}`,
    };
  }

  async closePosition(symbol: string): Promise<OrderResult> {
    logger.info("Closing position on Hyperliquid", { symbol });
    // TODO: market-close via /exchange
    return { success: true, orderId: `HL-CLOSE-${Date.now()}` };
  }
}