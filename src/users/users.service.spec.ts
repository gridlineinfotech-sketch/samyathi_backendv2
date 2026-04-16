import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('1');
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: expect.any(Object),
      });
    });
  });

  describe('updateProfile', () => {
    it('should update and return user', async () => {
      const mockUser = { id: '1', name: 'Updated', phone: '123456' };
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.updateProfile('1', { name: 'Updated', phone: '123456' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account if no active bookings', async () => {
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.user.delete.mockResolvedValue({});

      const result = await service.deleteAccount('1');
      expect(result.message).toBe('Account deleted successfully');
    });

    it('should throw if active bookings exist', async () => {
      mockPrisma.booking.count.mockResolvedValue(1);

      await expect(service.deleteAccount('1')).rejects.toThrow('Cannot delete account');
    });
  });
});
