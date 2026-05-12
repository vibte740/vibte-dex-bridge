import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

interface SizeInput {
  accountEquityUSD: number;
  entryPrice: number;
  stopLossPrice: number;
  leverage?: number;
}

interface SizeResult {
  notionalUSD: number;
  contracts: number;
  leverage: number;
}

/**
 * Fixed-fractional position sizer.
 * Risk = accountEquity * riskPerTradePct / 100
 * Size  = Risk / |entry - stopLoss|  (in contracts)
 */
export class PositionSizer {
  calculate({ accountEquityUSD, entryPrice, stopLossPrice, leverage }: SizeInput): SizeResult {
    const riskUSD = (accountEquityUSD * config.riskPerTradePct) / 100;
    const stopDistance = Math.abs(entryPrice - stopLossPrice);

    if (stopDistance === 0) {
      throw new Error("Stop-loss distance cannot be zero");
    }

    const contracts = riskUSD / stopDistance;
    const notionalUSD = contracts * entryPrice;
    const effectiveLeverage = Math.min(leverage ?? config.maxLeverage, config.maxLeverage);

    logger.debug("Position size calculated", {
      riskUSD,
      stopDistance,
      contracts,
      notionalUSD,
      effectiveLeverage,
    });

    return { notionalUSD, contracts, leverage: effectiveLeverage };
  }
}
