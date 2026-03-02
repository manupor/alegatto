import { getStripeSync } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Webhook payload must be a Buffer. Check that rawBody is captured correctly.");
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
