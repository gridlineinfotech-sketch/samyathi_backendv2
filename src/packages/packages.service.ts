import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) { }

  findAll() {
    return this.prisma.package.findMany({
      include: { dates: true, itinerary: true },
    });
  }

  findOne(id: string) {
    return this.prisma.package.findUnique({
      where: { id },
      include: { dates: true, itinerary: true },
    });
  }

  async searchPackages(filters: { location?: string; minDuration?: number; maxDuration?: number; startDate?: string }) {
    const where: any = {};
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }
    if (filters.minDuration !== undefined || filters.maxDuration !== undefined) {
      where.duration = {};
      if (filters.minDuration !== undefined) where.duration.gte = filters.minDuration;
      if (filters.maxDuration !== undefined) where.duration.lte = filters.maxDuration;
    }
    const packages = await this.prisma.package.findMany({ where, include: { dates: true, itinerary: true } });
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      return packages.filter(p => p.dates.some(d => new Date(d.startDate) >= start));
    }
    return packages;
  }

  async getAvailablePackages(dateFrom?: string, dateTo?: string) {
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    const where = Object.keys(dateFilter).length > 0 ? { dates: { some: { startDate: dateFilter, availableSeats: { gt: 0 } } } } : {};
    return this.prisma.package.findMany({
      where,
      include: { dates: { where: { availableSeats: { gt: 0 } } }, itinerary: true },
    });
  }
}
