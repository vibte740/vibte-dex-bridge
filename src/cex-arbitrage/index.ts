import { ArbitrageBot } from "./engine.js";
import { BinanceClient, CoinbaseClient, KrakenClient } from "./clients.js";

const CONFIG = {
  binance: {
    name: "Binance",
    apiKey: process.env.BINANCE_API_KEY ?? "",
    apiSecret: process.env.BINANCE_SECRET ?? "",
    baseUrl: process.env.BINANCE_API_BASE_URL ?? "https://api.binance.com",
    rateLimitMs: 100,
    fees: {
      maker: 0.001,
      taker: 0.001,
      withdrawal: { BTC: 0.0002, ETH: 0.001, SOL: 0.01 }
    }
  },
  coinbase: {
    name: "Coinbase",
    apiKey: process.env.COINBASE_API_KEY ?? "",
    apiSecret: process.env.COINBASE_SECRET ?? "",
    passphrase: process.env.COINBASE_PASSPHRASE ?? "",
    baseUrl: process.env.COINBASE_API_BASE_URL ?? "https://api.coinbase.com",
    rateLimitMs: 100,
    fees: {
      maker: 0.006,
      taker: 0.008,
      withdrawal: { BTC: 0.0001, ETH: 0.0005, SOL: 0.005 }
    }
  },
  kraken: {
    name: "Kraken",
    apiKey: process.env.KRAKEN_API_KEY ?? "",
    apiSecret: process.env.KRAKEN_SECRET ?? "",
    baseUrl: process.env.KRAKEN_API_BASE_URL ?? "https://api.kraken.com",
    rateLimitMs: 1000,
    fees: {
      maker: 0.0016,
      taker: 0.0026,
      withdrawal: { BTC: 0.00015, ETH: 0.003, SOL: 0.01 }
    }
  }
};

export async function main(): Promise<void> {
  const bot = new ArbitrageBot();
  bot.addExchange("binance", new BinanceClient(CONFIG.binance));
  bot.addExchange("coinbase", new CoinbaseClient(CONFIG.coinbase));
  bot.addExchange("kraken", new KrakenClient(CONFIG.kraken));

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    bot.stop();
    process.exit(0);
  });

  await bot.start();
}

if (process.argv[1]?.endsWith("index.js") || process.argv[1]?.endsWith("index.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
