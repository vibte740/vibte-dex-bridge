import { ExchangeClient } from "./clients.js";
import { ArbitrageOpportunity, ExecutionStep, OrderBook, OrderBookEntry, Ticker } from "./types.js";

export class ArbitrageEngine {
  private exchanges: Map<string, ExchangeClient> = new Map();
  private minSpreadPercent: number;
  private minProfitUsd: number;
  private maxSlippagePercent: number;

  constructor(config: { minSpreadPercent: number; minProfitUsd: number; maxSlippagePercent: number }) {
    this.minSpreadPercent = config.minSpreadPercent;
    this.minProfitUsd = config.minProfitUsd;
    this.maxSlippagePercent = config.maxSlippagePercent;
  }

  registerExchange(name: string, client: ExchangeClient): void {
    this.exchanges.set(name, client);
  }

  async scanPair(symbol: string, quoteAmount: number): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const exchangeNames = Array.from(this.exchanges.keys());

    const tickers = await Promise.all(
      exchangeNames.map(async (name) => {
        try {
          const ticker = await this.exchanges.get(name)!.getTicker(symbol);
          return { name, ticker };
        } catch (error) {
          console.error(`Failed to fetch ${name}:`, error);
          return null;
        }
      })
    );

    const validTickers = tickers.filter((t): t is { name: string; ticker: Ticker } => t !== null);

    for (let i = 0; i < validTickers.length; i++) {
      for (let j = i + 1; j < validTickers.length; j++) {
        const exA = validTickers[i];
        const exB = validTickers[j];

        const oppAB = await this.analyzeDirection(exA.name, exA.ticker, exB.name, exB.ticker, symbol, quoteAmount);
        if (oppAB) opportunities.push(oppAB);

        const oppBA = await this.analyzeDirection(exB.name, exB.ticker, exA.name, exA.ticker, symbol, quoteAmount);
        if (oppBA) opportunities.push(oppBA);
      }
    }

    return opportunities.sort((a, b) => b.netProfit - a.netProfit);
  }

  private async analyzeDirection(
    buyExName: string,
    buyTicker: Ticker,
    sellExName: string,
    sellTicker: Ticker,
    symbol: string,
    quoteAmount: number
  ): Promise<ArbitrageOpportunity | null> {
    const buyEx = this.exchanges.get(buyExName)!;
    const sellEx = this.exchanges.get(sellExName)!;

    const spread = sellTicker.bid - buyTicker.ask;
    const spreadPercent = (spread / buyTicker.ask) * 100;
    if (spreadPercent < this.minSpreadPercent) return null;

    const [buyBook, sellBook] = await Promise.all([
      buyEx.getOrderBook(symbol, 20),
      sellEx.getOrderBook(symbol, 20)
    ]);

    const buyResult = this.simulateMarketBuy(buyBook, quoteAmount);
    if (buyResult.baseReceived === 0) return null;

    const sellResult = this.simulateMarketSell(sellBook, buyResult.baseReceived);
    if (sellResult.quoteReceived === 0) return null;

    const buyFees = buyEx.getFees();
    const sellFees = sellEx.getFees();
    const buyFee = quoteAmount * buyFees.taker;
    const sellFee = sellResult.quoteReceived * sellFees.taker;
    const withdrawalFee = sellFees.withdrawal[symbol.split("/")[0]] ?? 0;

    const grossProfit = sellResult.quoteReceived - quoteAmount;
    const netProfit = grossProfit - buyFee - sellFee - withdrawalFee * sellTicker.bid;
    if (netProfit < this.minProfitUsd) return null;

    const slippageBuy = ((buyResult.avgPrice - buyTicker.ask) / buyTicker.ask) * 100;
    const slippageSell = ((sellTicker.bid - sellResult.avgPrice) / sellTicker.bid) * 100;
    if (slippageBuy > this.maxSlippagePercent || slippageSell > this.maxSlippagePercent) return null;

    const profitPercent = (netProfit / quoteAmount) * 100;
    const baseAmount = buyResult.baseReceived;

    return {
      pair: symbol,
      buyExchange: buyExName,
      sellExchange: sellExName,
      buyPrice: buyResult.avgPrice,
      sellPrice: sellResult.avgPrice,
      spreadPercent,
      grossProfit,
      netProfit,
      profitPercent,
      maxTradeSize: Math.min(buyResult.maxSize, sellResult.maxSize),
      confidence: this.assessConfidence(spreadPercent, slippageBuy + slippageSell, profitPercent),
      executionPath: [
        {
          action: "buy",
          exchange: buyExName,
          amount: quoteAmount,
          price: buyResult.avgPrice,
          fee: buyFee,
          estimatedTimeMs: 500
        },
        {
          action: "transfer",
          exchange: buyExName,
          amount: baseAmount,
          price: 0,
          fee: withdrawalFee * buyTicker.ask,
          estimatedTimeMs: 600_000
        },
        {
          action: "sell",
          exchange: sellExName,
          amount: baseAmount,
          price: sellResult.avgPrice,
          fee: sellFee,
          estimatedTimeMs: 500
        }
      ]
    };
  }

  private simulateMarketBuy(book: OrderBook, quoteToSpend: number) {
    let remaining = quoteToSpend;
    let baseReceived = 0;

    for (const ask of book.asks) {
      const cost = ask.price * ask.amount;
      if (remaining >= cost) {
        baseReceived += ask.amount;
        remaining -= cost;
      } else {
        baseReceived += remaining / ask.price;
        remaining = 0;
        break;
      }
    }

    const spent = quoteToSpend - remaining;
    const avgPrice = baseReceived > 0 ? spent / baseReceived : 0;
    return { baseReceived, avgPrice, maxSize: baseReceived };
  }

  private simulateMarketSell(book: OrderBook, baseToSell: number) {
    let remaining = baseToSell;
    let quoteReceived = 0;

    for (const bid of book.bids) {
      if (remaining >= bid.amount) {
        quoteReceived += bid.price * bid.amount;
        remaining -= bid.amount;
      } else {
        quoteReceived += bid.price * remaining;
        remaining = 0;
        break;
      }
    }

    const sold = baseToSell - remaining;
    const avgPrice = sold > 0 ? quoteReceived / sold : 0;
    return { quoteReceived, avgPrice, maxSize: sold };
  }

  private assessConfidence(spread: number, slippage: number, profit: number): "low" | "medium" | "high" {
    if (spread > 0.5 && slippage < 0.02 && profit > 100) return "high";
    if (spread > 0.2 && slippage < 0.05 && profit > 25) return "medium";
    return "low";
  }
}

export class ExecutionEngine {
  private activeTrades: Map<string, ArbitrageOpportunity> = new Map();
  private currentExposure = 0;
  private maxConcurrentTrades: number;
  private maxExposureUsd: number;

  constructor(config: { maxConcurrent: number; maxExposureUsd: number }) {
    this.maxConcurrentTrades = config.maxConcurrent;
    this.maxExposureUsd = config.maxExposureUsd;
  }

  async executeOpportunity(opp: ArbitrageOpportunity, exchanges: Map<string, ExchangeClient>): Promise<boolean> {
    if (this.activeTrades.size >= this.maxConcurrentTrades) {
      console.log("Max concurrent trades reached, skipping");
      return false;
    }

    if (this.currentExposure + opp.executionPath[0].amount > this.maxExposureUsd) {
      console.log("Would exceed max exposure, skipping");
      return false;
    }

    const tradeId = `${opp.pair}-${Date.now()}`;
    this.activeTrades.set(tradeId, opp);
    this.currentExposure += opp.executionPath[0].amount;

    try {
      const buyEx = exchanges.get(opp.buyExchange)!;
      const sellEx = exchanges.get(opp.sellExchange)!;
      const baseAsset = opp.pair.split("/")[0];

      console.log(`[${tradeId}] Buying ${opp.executionPath[2].amount.toFixed(6)} ${baseAsset} on ${opp.buyExchange}`);
      const buyOrderId = await buyEx.placeMarketBuy(opp.pair, opp.executionPath[0].amount);
      await this.waitForFill(buyEx, buyOrderId);

      console.log(`[${tradeId}] Withdrawing to ${opp.sellExchange}`);
      const depositAddress = await sellEx.getDepositAddress(baseAsset);
      await buyEx.withdraw(baseAsset, opp.executionPath[2].amount, depositAddress);

      console.log(`[${tradeId}] Waiting for deposit confirmation...`);
      await this.waitForDeposit(sellEx, baseAsset, opp.executionPath[2].amount);

      console.log(`[${tradeId}] Selling on ${opp.sellExchange}`);
      await sellEx.placeMarketSell(opp.pair, opp.executionPath[2].amount);

      const quoteAsset = opp.pair.split("/")[1];
      const finalBalance = await sellEx.getBalance(quoteAsset);
      console.log(`[${tradeId}] Complete. Final balance: ${finalBalance}`);

      this.activeTrades.delete(tradeId);
      this.currentExposure -= opp.executionPath[0].amount;
      return true;
    } catch (error) {
      console.error(`[${tradeId}] Execution failed:`, error);
      this.activeTrades.delete(tradeId);
      this.currentExposure -= opp.executionPath[0].amount;
      return false;
    }
  }

  private async waitForFill(_exchange: ExchangeClient, _orderId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async waitForDeposit(exchange: ExchangeClient, asset: string, expectedAmount: number): Promise<void> {
    let confirmed = false;
    let attempts = 0;

    while (!confirmed && attempts < 120) {
      const balance = await exchange.getBalance(asset);
      if (balance >= expectedAmount * 0.99) confirmed = true;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }
  }
}

export class ArbitrageBot {
  private engine: ArbitrageEngine;
  private executor: ExecutionEngine;
  private exchanges: Map<string, ExchangeClient> = new Map();
  private isRunning = false;

  constructor() {
    this.engine = new ArbitrageEngine({
      minSpreadPercent: 0.15,
      minProfitUsd: 50,
      maxSlippagePercent: 0.05
    });

    this.executor = new ExecutionEngine({
      maxConcurrent: 2,
      maxExposureUsd: 50_000
    });
  }

  addExchange(name: string, client: ExchangeClient): void {
    this.exchanges.set(name, client);
    this.engine.registerExchange(name, client);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];

    while (this.isRunning) {
      for (const pair of pairs) {
        try {
          const opportunities = await this.engine.scanPair(pair, 10_000);
          if (opportunities.length > 0) {
            console.log(`\n=== Opportunities found for ${pair} ===`);
            opportunities.forEach((opp) => {
              console.log(`Direction: ${opp.buyExchange} → ${opp.sellExchange}`);
              console.log(`Spread: ${opp.spreadPercent.toFixed(3)}%`);
              console.log(`Gross Profit: $${opp.grossProfit.toFixed(2)}`);
              console.log(`Net Profit: $${opp.netProfit.toFixed(2)} (${opp.profitPercent.toFixed(3)}%)`);
              console.log(`Confidence: ${opp.confidence}`);
              console.log(`Max Size: ${opp.maxTradeSize.toFixed(6)} ${pair.split("/")[0]}\n`);
            });

            const best = opportunities.find((o) => o.confidence === "high");
            if (best) {
              const success = await this.executor.executeOpportunity(best, this.exchanges);
              if (success) console.log("Trade executed successfully");
            }
          }
        } catch (error) {
          console.error(`Error scanning ${pair}:`, error);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  stop(): void {
    this.isRunning = false;
  }
}
