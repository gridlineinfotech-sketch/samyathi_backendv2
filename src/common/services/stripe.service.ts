import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set - using mock mode');
      this.stripe = {} as Stripe;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', metadata: Record<string, string> = {}): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        const mockId = `pi_${Date.now()}`;
        return { clientSecret: `mock_${mockId}`, paymentIntentId: mockId };
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        metadata,
        automatic_payment_methods: { enabled: true },
      });

      return { clientSecret: paymentIntent.client_secret!, paymentIntentId: paymentIntent.id };
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error.message);
      throw new BadRequestException('Failed to initiate payment');
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return true;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      return false;
    }
  }

  async createRefund(paymentIntentId: string, amount?: number): Promise<string> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return `re_${Date.now()}`;

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return refund.id;
    } catch (error) {
      this.logger.error('Refund failed:', error.message);
      throw new BadRequestException('Failed to process refund');
    }
  }

  async constructEventFromPayload(payload: Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
