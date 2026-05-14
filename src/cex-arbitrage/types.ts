export interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  rateLimitMs: number;
  passphrase?: string;
  fees: {
    maker: number;
    taker: number;
    withdrawal: Record<string, number>;
  };
}

export interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume24h: number;
  timestamp: number;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

export interface ExecutionStep {
  action: "buy" | "sell" | "transfer" | "wait";
  exchange: string;
  amount: number;
  price: number;
  fee: number;
  estimatedTimeMs: number;
}

export interface ArbitrageOpportunity {
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  grossProfit: number;
  netProfit: number;
  profitPercent: number;
  maxTradeSize: number;
  confidence: "low" | "medium" | "high";
  executionPath: ExecutionStep[];
}
