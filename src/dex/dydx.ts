import type { OrderRequest, OrderResult } from "../types/webhook.js";
import { logger } from "../utils/logger.js";

/**
 * dYdX v4 client stub.
 * Install the official SDK:  npm install @dydxprotocol/v4-client-js
 * Then replace stubs with CompositeClient calls.
 */
export class DydxClient {
  constructor() {
    logger.info("DydxClient ready");
  }

  async getAccountEquity(): Promise<number> {
    logger.debug("dYdX getAccountEquity() called (stub)");
    return 10_000;
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    logger.info("Placing order on dYdX", { order });
    // TODO: CompositeClient.placeOrder(...)
    return { success: true, orderId: `DYDX-${Date.now()}` };
  }

  async closePosition(symbol: string): Promise<OrderResult> {
    logger.info("Closing position on dYdX", { symbol });
    return { success: true, orderId: `DYDX-CLOSE-${Date.now()}` };
  }
}
