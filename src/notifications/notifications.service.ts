import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async sendNotification(data: {
    userId?: string;
    title: string;
    message: string;
    type?: string;
    broadcast?: boolean;
  }) {
    const { userId, title, message, type = 'general', broadcast = false } = data;

    if (broadcast) {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title,
          message,
          type,
        })),
      });
      return { message: 'Notification broadcast to all users', count: users.length };
    }

    if (!userId) {
      throw new Error('userId is required when not broadcasting');
    }

    const notification = await this.prisma.notification.create({
      data: { userId, title, message, type },
    });

    return { message: 'Notification sent successfully', notification };
  }
}
