import type { WebhookPayload, OrderResult, OrderType } from "../types/webhook.js";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { PositionSizer } from "./positionSizer.js";
import { SupertrendValidator } from "./supetrendValidator.js";
import { HyperliquidClient } from "../dex/hyperliquid.js";
import { DydxClient } from "../dex/dydx.js";

const sizer = new PositionSizer();
const validator = new SupertrendValidator();

export class OrderService {
  private readonly dexClient: HyperliquidClient | DydxClient;

  constructor() {
    this.dexClient =
      config.defaultDex === "hyperliquid"
        ? new HyperliquidClient()
        : new DydxClient();

    logger.info(`OrderService initialised with DEX provider: ${config.defaultDex}`);
  }

  async process(payload: WebhookPayload): Promise<OrderResult> {
    // 1 — Signal integrity check
    if (!validator.validate(payload)) {
      return { success: false, error: "Signal failed Supertrend validation" };
    }

    // 2 — Handle close signal
    if (payload.side === "close") {
      return this.dexClient.closePosition(payload.symbol);
    }

    // 3 — Fetch live account equity
    const equity = await this.dexClient.getAccountEquity();

    // 4 — Calculate position size (price is required for calculation)
    if (payload.price === undefined) {
      return { success: false, error: "Price is required for position sizing" };
    }

    const sizerResult = sizer.calculate({
      accountEquityUSD: equity,
      entryPrice: payload.price,
      stopLossPrice: payload.sl,
      leverage: payload.leverage,
    });

    // 5 — Determine order type (market or limit)
    const orderType: OrderType = payload.orderType ?? "market";
    
    // For limit orders, use the price from webhook as the limit price
    // For market orders, we don't specify a price (executed at market price)
    const placeOrderParams = {
      symbol: payload.symbol,
      side: payload.side,
      type: orderType,
      size: sizerResult.notionalUSD,
      stopLoss: payload.sl,
      takeProfit: payload.tp,
      leverage: sizerResult.leverage,
      ...(orderType === "limit" && { price: payload.price }), // Add price only for limit orders
    };

    // 6 — Place order
    const result = await this.dexClient.placeOrder(placeOrderParams);

    logger.info("Order processed", {
      symbol: payload.symbol,
      side: payload.side,
      orderType,
      notionalUSD: sizerResult.notionalUSD,
      result,
    });

    return result;
  }
}
