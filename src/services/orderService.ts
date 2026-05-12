import type { WebhookPayload, OrderResult } from "../types/webhook.js";
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

    // 4 — Calculate position size
    const { notionalUSD, leverage } = sizer.calculate({
      accountEquityUSD: equity,
      entryPrice: payload.price,
      stopLossPrice: payload.sl,
      leverage: payload.leverage,
    });

    // 5 — Place order
    const result = await this.dexClient.placeOrder({
      symbol: payload.symbol,
      side: payload.side,
      type: "market",
      size: notionalUSD,
      stopLoss: payload.sl,
      takeProfit: payload.tp,
      leverage,
    });

    logger.info("Order processed", {
      symbol: payload.symbol,
      side: payload.side,
      notionalUSD,
      result,
    });

    return result;
  }
}
