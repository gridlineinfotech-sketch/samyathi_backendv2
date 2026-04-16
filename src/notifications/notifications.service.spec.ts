import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send to single user', async () => {
      const mockNotification = { id: '1', userId: 'user1', title: 'Test', message: 'Hello' };
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.sendNotification({
        userId: 'user1',
        title: 'Test',
        message: 'Hello',
      });

      expect(result.message).toBe('Notification sent successfully');
    });

    it('should broadcast to all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.sendNotification({
        title: 'Broadcast',
        message: 'To all',
        broadcast: true,
      });

      expect(result.count).toBe(2);
    });
  });
});
