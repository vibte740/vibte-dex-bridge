# Vibte DEX Bridge v2.0

Automated bridge that executes **TradingView Supertrend v6** signals on DEXs (Hyperliquid / dYdX).
Built with **TypeScript 5**, **Express**, and **Docker**.

---

## Quick Start

```bash
# 1. Clone & install
npm install

# 2. Configure
cp .env.example .env
# → fill in WEBHOOK_SECRET, PRIVATE_KEY, and DEX settings

# 3. Dev mode
npm run dev

# 4. Production (Docker)
docker compose up --build -d
```

---

## TradingView Webhook Payload

Send a POST to `POST /api/webhook` with:

```json
{
  "secret": "your_webhook_secret",
  "side": "buy",
  "symbol": "BTC",
  "price": 65000,
  "sl": 63500,
  "tp": 68000,
  "leverage": 5
}
```

`side` accepts: `"buy"` | `"sell"` | `"close"`

---

## Project Structure

```
src/
├── index.ts                   # Entry point & graceful shutdown
├── server.ts                  # Express app factory
├── types/
│   └── webhook.ts             # All TypeScript interfaces + Zod schemas
├── middleware/
│   ├── validateWebhook.ts     # Secret + symbol + schema validation
│   └── rateLimiter.ts         # Redis-backed rate limiter
├── routes/
│   └── webhook.ts             # POST /api/webhook
├── services/
│   ├── orderService.ts        # Orchestrates validation → sizing → execution
│   ├── supetrendValidator.ts  # Signal integrity checks
│   └── positionSizer.ts       # Fixed-fractional position sizing
├── dex/
│   ├── hyperliquid.ts         # Hyperliquid client
│   └── dydx.ts                # dYdX v4 client
└── utils/
    ├── config.ts              # Typed env config loader
    └── logger.ts              # Winston structured logger
```

---

## Implementing the DEX Clients

The `src/dex/` stubs include clear `TODO` comments. To wire up live trading:

- **Hyperliquid** — use `@hyperliquid/sdk` or raw REST calls to `https://api.hyperliquid.xyz`
- **dYdX v4** — install `@dydxprotocol/v4-client-js` and call `CompositeClient.placeOrder`

---

## Security Checklist

- [ ] Never commit `.env` — use Docker secrets or a vault in production
- [ ] Set `WEBHOOK_SECRET` to a long random string in TradingView alert message
- [ ] Run behind a reverse-proxy (Nginx / Caddy) with TLS
- [ ] Enable UFW: allow only 80/443 publicly; restrict 8080 to localhost
