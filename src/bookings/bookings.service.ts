import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) { }

  async initiateBooking(userId: string, body: { packageDateId: string; seats: number }) {
    const packageDate = await this.prisma.packageDate.findUnique({
      where: { id: body.packageDateId }
    });

    if (!packageDate || packageDate.availableSeats < body.seats) {
      throw new Error('Not enough seats or package date not found');
    }

    const totalAmount = packageDate.price * body.seats;
    await this.prisma.packageDate.update({
      where: { id: body.packageDateId },
      data: { availableSeats: { decrement: body.seats } },
    });

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

  async getBookingById(userId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { packageDate: { include: { package: true } }, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('Access denied');
    return booking;
  }

  async cancelBooking(userId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new ForbiddenException('Access denied');
    if (booking.status === 'cancelled') throw new Error('Booking already cancelled');

    await this.prisma.packageDate.update({
      where: { id: booking.packageDateId },
      data: { availableSeats: { increment: booking.seats } },
    });

    return this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
