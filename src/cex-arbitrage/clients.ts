import crypto from "crypto";
import { ExchangeConfig, OrderBook, OrderBookEntry, Ticker } from "./types.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export abstract class ExchangeClient {
  constructor(protected readonly config: ExchangeConfig) {}

  abstract getTicker(symbol: string): Promise<Ticker>;
  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  abstract placeMarketBuy(symbol: string, amount: number): Promise<string>;
  abstract placeMarketSell(symbol: string, amount: number): Promise<string>;
  abstract getBalance(asset: string): Promise<number>;
  abstract withdraw(asset: string, amount: number, address: string): Promise<string>;
  abstract getDepositAddress(asset: string): Promise<string>;

  getFees() {
    return this.config.fees;
  }

  protected async rateLimit(): Promise<void> {
    await sleep(this.config.rateLimitMs);
  }
}

function formatSymbolForBinance(symbol: string): string {
  return symbol.replace("/", "");
}

function formatSymbolForCoinbase(symbol: string): string {
  return symbol.replace("/", "-");
}

function formatSymbolForKraken(symbol: string): string {
  return symbol.replace("BTC/", "XBT/").replace("/", "");
}

function base64(data: Buffer): string {
  return data.toString("base64");
}

export class BinanceClient extends ExchangeClient {
  private signedRequest(endpoint: string, params: Record<string, string>) {
    const timestamp = Date.now().toString();
    const query = new URLSearchParams({ ...params, timestamp }).toString();
    const signature = crypto
      .createHmac("sha256", this.config.apiSecret)
      .update(query)
      .digest("hex");

    const url = `${this.config.baseUrl}${endpoint}?${query}&signature=${signature}`;
    return fetch(url, {
      headers: { "X-MBX-APIKEY": this.config.apiKey }
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Binance API error: ${res.status} ${await res.text()}`);
      return res.json();
    });
  }

  async getTicker(symbol: string): Promise<Ticker> {
    await this.rateLimit();
    const formatted = formatSymbolForBinance(symbol);
    const data = await fetch(
      `${this.config.baseUrl}/api/v3/ticker/bookTicker?symbol=${formatted}`
    ).then(async (res) => {
      if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
      return res.json();
    });

    return {
      symbol,
      bid: parseFloat(data.bidPrice),
      ask: parseFloat(data.askPrice),
      last: (parseFloat(data.bidPrice) + parseFloat(data.askPrice)) / 2,
      volume24h: 0,
      timestamp: Date.now()
    };
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    await this.rateLimit();
    const formatted = formatSymbolForBinance(symbol);
    const data = await fetch(
      `${this.config.baseUrl}/api/v3/depth?symbol=${formatted}&limit=${depth}`
    ).then(async (res) => {
      if (!res.ok) throw new Error(`Binance order book error: ${res.status}`);
      return res.json();
    });

    return {
      symbol,
      bids: data.bids.map((b: string[]) => ({ price: parseFloat(b[0]), amount: parseFloat(b[1]) })),
      asks: data.asks.map((a: string[]) => ({ price: parseFloat(a[0]), amount: parseFloat(a[1]) })),
      timestamp: Date.now()
    };
  }

  async placeMarketBuy(symbol: string, quoteAmount: number): Promise<string> {
    const formatted = formatSymbolForBinance(symbol);
    const result = await this.signedRequest("/api/v3/order", {
      symbol: formatted,
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: quoteAmount.toFixed(8)
    });
    return result.orderId;
  }

  async placeMarketSell(symbol: string, baseAmount: number): Promise<string> {
    const formatted = formatSymbolForBinance(symbol);
    const result = await this.signedRequest("/api/v3/order", {
      symbol: formatted,
      side: "SELL",
      type: "MARKET",
      quantity: baseAmount.toFixed(8)
    });
    return result.orderId;
  }

  async getBalance(asset: string): Promise<number> {
    const data = await this.signedRequest("/api/v3/account", {});
    const balance = data.balances.find((b: any) => b.asset === asset);
    return balance ? parseFloat(balance.free) : 0;
  }

  async withdraw(asset: string, amount: number, address: string): Promise<string> {
    const result = await this.signedRequest("/sapi/v1/capital/withdraw/apply", {
      coin: asset,
      amount: amount.toFixed(8),
      address
    });
    return result.id;
  }

  async getDepositAddress(asset: string): Promise<string> {
    const result = await this.signedRequest("/sapi/v1/capital/deposit/address", {
      coin: asset
    });
    return result.address;
  }
}

export class CoinbaseClient extends ExchangeClient {
  private async signedRequest(method: string, endpoint: string, body = "") {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + method.toUpperCase() + endpoint + body;
    const signature = crypto
      .createHmac("sha256", this.config.apiSecret)
      .update(message)
      .digest();

    const sigB64 = base64(Buffer.from(signature));
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: {
        "CB-ACCESS-KEY": this.config.apiKey,
        "CB-ACCESS-SIGN": sigB64,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-ACCESS-PASSPHRASE": this.config.passphrase ?? "",
        "Content-Type": "application/json"
      },
      body: body || undefined
    });

    if (!response.ok) throw new Error(`Coinbase API error: ${response.status} ${await response.text()}`);
    return response.json();
  }

  async getTicker(symbol: string): Promise<Ticker> {
    await this.rateLimit();
    const formatted = formatSymbolForCoinbase(symbol);
    const data = await fetch(`${this.config.baseUrl}/products/${formatted}/ticker`).then(async (res) => {
      if (!res.ok) throw new Error(`Coinbase ticker error: ${res.status}`);
      return res.json();
    });

    return {
      symbol,
      bid: parseFloat(data.bid),
      ask: parseFloat(data.ask),
      last: parseFloat(data.price),
      volume24h: parseFloat(data.volume_24h),
      timestamp: Date.now()
    };
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    await this.rateLimit();
    const formatted = formatSymbolForCoinbase(symbol);
    const data = await fetch(`${this.config.baseUrl}/products/${formatted}/book?level=2`).then(async (res) => {
      if (!res.ok) throw new Error(`Coinbase order book error: ${res.status}`);
      return res.json();
    });

    return {
      symbol,
      bids: data.bids.slice(0, depth).map((b: any) => ({ price: parseFloat(b[0]), amount: parseFloat(b[1]) })),
      asks: data.asks.slice(0, depth).map((a: any) => ({ price: parseFloat(a[0]), amount: parseFloat(a[1]) })),
      timestamp: Date.now()
    };
  }

  async placeMarketBuy(symbol: string, quoteAmount: number): Promise<string> {
    const formatted = formatSymbolForCoinbase(symbol);
    const result = await this.signedRequest("POST", "/orders", JSON.stringify({
      product_id: formatted,
      side: "buy",
      order_configuration: {
        market_market_ioc: { quote_size: quoteAmount.toFixed(2) }
      }
    }));
    return result.order_id;
  }

  async placeMarketSell(symbol: string, baseAmount: number): Promise<string> {
    const formatted = formatSymbolForCoinbase(symbol);
    const result = await this.signedRequest("POST", "/orders", JSON.stringify({
      product_id: formatted,
      side: "sell",
      order_configuration: {
        market_market_ioc: { base_size: baseAmount.toFixed(8) }
      }
    }));
    return result.order_id;
  }

  async getBalance(asset: string): Promise<number> {
    const data = await this.signedRequest("GET", "/accounts", "");
    const account = data.accounts.find((a: any) => a.currency === asset);
    return account ? parseFloat(account.available_balance.value) : 0;
  }

  async withdraw(asset: string, amount: number, address: string): Promise<string> {
    const result = await this.signedRequest("POST", "/transactions", JSON.stringify({
      type: "send",
      to: address,
      amount: amount.toFixed(8),
      currency: asset
    }));
    return result.id;
  }

  async getDepositAddress(asset: string): Promise<string> {
    const result = await this.signedRequest("POST", `/accounts/${asset}/addresses`, "");
    return result.address;
  }
}

export class KrakenClient extends ExchangeClient {
  private async signedRequest(endpoint: string, params: Record<string, string>) {
    const nonce = Date.now().toString();
    const body = new URLSearchParams({ ...params, nonce }).toString();
    const sha256 = crypto.createHash("sha256").update(nonce + body).digest();
    const secret = Buffer.from(this.config.apiSecret, "base64");
    const hmac = crypto.createHmac("sha512", secret).update(Buffer.concat([sha256, Buffer.from(endpoint)])).digest("base64");

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "API-Key": this.config.apiKey,
        "API-Sign": hmac,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) throw new Error(`Kraken API error: ${response.status} ${await response.text()}`);
    const json = await response.json();
    if (json.error?.length) throw new Error(`Kraken error: ${json.error.join(", ")}`);
    return json.result;
  }

  async getTicker(symbol: string): Promise<Ticker> {
    await this.rateLimit();
    const formatted = formatSymbolForKraken(symbol);
    const data = await fetch(`${this.config.baseUrl}/public/Ticker?pair=${formatted}`).then(async (res) => {
      if (!res.ok) throw new Error(`Kraken ticker error: ${res.status}`);
      return res.json();
    });

    const pairData = Object.values(data.result)[0] as any;
    return {
      symbol,
      bid: parseFloat(pairData.b[0]),
      ask: parseFloat(pairData.a[0]),
      last: parseFloat(pairData.c[0]),
      volume24h: parseFloat(pairData.v[1]),
      timestamp: Date.now()
    };
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    await this.rateLimit();
    const formatted = formatSymbolForKraken(symbol);
    const data = await fetch(`${this.config.baseUrl}/public/Depth?pair=${formatted}&count=${depth}`).then(async (res) => {
      if (!res.ok) throw new Error(`Kraken order book error: ${res.status}`);
      return res.json();
    });

    const pairData = Object.values(data.result)[0] as any;
    return {
      symbol,
      bids: pairData.bids.map((b: any) => ({ price: parseFloat(b[0]), amount: parseFloat(b[1]) })),
      asks: pairData.asks.map((a: any) => ({ price: parseFloat(a[0]), amount: parseFloat(a[1]) })),
      timestamp: Date.now()
    };
  }

  async placeMarketBuy(symbol: string, quoteAmount: number): Promise<string> {
    const formatted = formatSymbolForKraken(symbol);
    const result = await this.signedRequest("/private/AddOrder", {
      pair: formatted,
      type: "buy",
      ordertype: "market",
      volume: "0",
      cost: quoteAmount.toFixed(2)
    });
    return result.txid[0];
  }

  async placeMarketSell(symbol: string, baseAmount: number): Promise<string> {
    const formatted = formatSymbolForKraken(symbol);
    const result = await this.signedRequest("/private/AddOrder", {
      pair: formatted,
      type: "sell",
      ordertype: "market",
      volume: baseAmount.toFixed(8)
    });
    return result.txid[0];
  }

  async getBalance(asset: string): Promise<number> {
    const data = await this.signedRequest("/private/Balance", {});
    const key = asset === "BTC" ? "XXBT" : `X${asset}`;
    return parseFloat(data[key] || "0");
  }

  async withdraw(asset: string, amount: number, address: string): Promise<string> {
    const key = asset === "BTC" ? "XBT" : asset;
    const result = await this.signedRequest("/private/Withdraw", {
      asset: key,
      amount: amount.toFixed(8),
      key: address
    });
    return result.refid;
  }

  async getDepositAddress(asset: string): Promise<string> {
    const key = asset === "BTC" ? "XBT" : asset;
    const result = await this.signedRequest("/private/DepositAddresses", {
      asset: key,
      method: "Bitcoin"
    });
    return result[0]?.address || "";
  }
}
