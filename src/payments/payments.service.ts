import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StripeService } from '../common/services/stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) { }

  async initiatePayment(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, packageDate: { include: { package: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new NotFoundException('Booking not found');
    if (booking.payment) throw new Error('Payment already initiated');

    const { clientSecret, paymentIntentId } = await this.stripeService.createPaymentIntent(
      booking.totalAmount,
      'usd',
      { bookingId: booking.id, userId: booking.userId },
    );

    await this.prisma.payment.create({
      data: {
        bookingId,
        gatewayRef: paymentIntentId,
        amount: booking.totalAmount,
        status: 'pending',
      },
    });

    const paymentUrl = process.env.STRIPE_SECRET_KEY
      ? `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment?client_secret=${clientSecret}`
      : `https://mock-gateway.com/pay/${bookingId}`;

    return { paymentUrl, gatewayRef: paymentIntentId, clientSecret };
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: { include: { user: true, packageDate: { include: { package: true } } } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async webhook(body: any, signature?: string) {
    if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        const event = await this.stripeService.constructEventFromPayload(Buffer.from(JSON.stringify(body)), signature);
        if (event.type === 'payment_intent.succeeded') {
          await this.handlePaymentSuccess((event.data.object as any).id);
        }
        return { received: true, processed: true, event: event.type };
      } catch (err) {
        return { received: true, processed: false, error: err.message };
      }
    }

    const { bookingId, status } = body;
    if (bookingId && status) {
      await this.prisma.payment.updateMany({ where: { bookingId }, data: { status } });
      if (status === 'completed') {
        await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'confirmed' } });
      }
    }
    return { received: true, processed: !!bookingId };
  }

  private async handlePaymentSuccess(paymentIntentId: string) {
    await this.prisma.payment.updateMany({ where: { gatewayRef: paymentIntentId }, data: { status: 'completed' } });
    const payment = await this.prisma.payment.findFirst({ where: { gatewayRef: paymentIntentId }, include: { booking: true } });
    if (payment?.booking) {
      await this.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'confirmed' } });
    }
  }
}
