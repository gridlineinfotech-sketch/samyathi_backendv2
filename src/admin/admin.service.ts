import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  createPackage(data: any) {
    return this.prisma.package.create({ data });
  }

  createPackageDate(data: any) {
    return this.prisma.packageDate.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      }
    });
  }

  getBookings() {
    return this.prisma.booking.findMany({
      include: { user: true, packageDate: { include: { package: true } } }
    });
  }

  async approveKyc(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'approved' }
    });
  }
}
