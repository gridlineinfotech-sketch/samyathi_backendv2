import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatar: true, phone: true, verified: true, role: true, kycStatus: true, createdAt: true },
    });
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, avatar: true, phone: true, verified: true, role: true, kycStatus: true },
    });
  }

  async getMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        packageDate: { include: { package: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAccount(userId: string) {
    const activeBookings = await this.prisma.booking.count({
      where: { userId, status: { in: ['pending_payment', 'confirmed'] } },
    });
    if (activeBookings > 0) {
      throw new ForbiddenException('Cannot delete account with active bookings. Please cancel them first.');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted successfully' };
  }
}
