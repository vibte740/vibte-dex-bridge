import { Router } from "express";
import type { Request, Response } from "express";
import { validateWebhook } from "../middleware/validateWebhook.js";
import { webhookRateLimiter } from "../middleware/rateLimiter.js";
import { OrderService } from "../services/orderService.js";
import { logger } from "../utils/logger.js";
import type { WebhookPayload } from "../types/webhook.js";

const router = Router();
const orderService = new OrderService();

router.post(
  "/webhook",
  webhookRateLimiter,
  validateWebhook,
  async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as WebhookPayload;

    logger.info("Webhook received", {
      symbol: payload.symbol,
      side: payload.side,
      price: payload.price,
      orderType: payload.orderType,
    });

    try {
      const result = await orderService.process(payload);

      if (!result.success) {
        res.status(422).json({ status: "rejected", reason: result.error });
        return;
      }

      res.status(200).json({ status: "ok", orderId: result.orderId });
    } catch (err) {
      logger.error("Order processing failed", { err });
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  }
);

export default router;
