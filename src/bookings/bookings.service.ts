import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) { }

  async initiateBooking(userId: string, body: CreateBookingDto) {
    if (!Array.isArray(body.travellers) || body.travellers.length !== body.seats) {
      throw new BadRequestException('Traveller count must equal number of seats');
    }

    const packageDate = await this.prisma.packageDate.findUnique({
      where: { id: body.packageDateId }
    });

    if (!packageDate || packageDate.availableSeats < body.seats) {
      throw new NotFoundException('Not enough seats or package date not found');
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
        travellers: body.travellers as unknown as Prisma.InputJsonValue,
        note: body.note,
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
