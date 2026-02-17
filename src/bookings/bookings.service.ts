import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) { }

  async initiateBooking(userId: string, body: { packageDateId: string; seats: number }) {
    const packageDate = await this.prisma.packageDate.findUnique({
      where: { id: body.packageDateId }
    });

    // Simple check for seats
    if (!packageDate || packageDate.availableSeats < body.seats) {
      throw new Error('Not enough seats or package date not found');
    }

    const totalAmount = packageDate.price * body.seats;

    return this.prisma.booking.create({
      data: {
        userId,
        packageDateId: body.packageDateId,
        seats: body.seats,
        totalAmount,
        status: 'pending_payment',
      }
    });
  }
}
