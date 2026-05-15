import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  // Packages
  getPackages() {
    return this.prisma.package.findMany({ include: { dates: true, itinerary: true } });
  }

  createPackage(data: any) {
    const packageData: any = { ...data };
    if (packageData.itineraries) {
      packageData.itinerary = { create: packageData.itineraries };
      delete packageData.itineraries;
    }
    return this.prisma.package.create({ data: packageData });
  }

  updatePackage(id: string, data: any) {
    const packageData: any = { ...data };
    if (packageData.itineraries) {
      packageData.itinerary = { deleteMany: {}, create: packageData.itineraries };
      delete packageData.itineraries;
    }
    return this.prisma.package.update({ where: { id }, data: packageData });
  }

  async deletePackage(id: string) {
    await this.prisma.packageDate.deleteMany({ where: { packageId: id } });
    await this.prisma.package.delete({ where: { id } });
    return { message: 'Package deleted' };
  }

  async getPackage(id: string) {
    const packageItem = await this.prisma.package.findUnique({
      where: { id },
      include: {
        dates: { include: { bookings: { include: { user: true, payment: true } } } },
        itinerary: true,
      },
    });
    if (!packageItem) throw new NotFoundException('Package not found');

    const bookings = packageItem.dates.flatMap((date) =>
      date.bookings.map((booking) => ({
        ...booking,
        packageDate: {
          id: date.id,
          startDate: date.startDate,
          endDate: date.endDate,
          price: date.price,
          totalSeats: date.totalSeats,
          availableSeats: date.availableSeats,
        },
      })),
    );

    const totalBookings = bookings.length;
    const totalSeatsBooked = bookings.reduce((sum, booking) => sum + booking.seats, 0);
    const runDates = packageItem.dates.map((date) => ({
      id: date.id,
      startDate: date.startDate,
      endDate: date.endDate,
      totalSeats: date.totalSeats,
      availableSeats: date.availableSeats,
      price: date.price,
    }));

    return {
      ...packageItem,
      totalBookings,
      totalSeatsBooked,
      runDates,
      bookings,
    };
  }

  // Package Dates
  createPackageDate(data: any) {
    return this.prisma.packageDate.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      }
    });
  }

  updatePackageDate(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    return this.prisma.packageDate.update({ where: { id }, data: updateData });
  }

  deletePackageDate(id: string) {
    return this.prisma.packageDate.delete({ where: { id } });
  }

  // Bookings
  getBookings(status?: string) {
    const where = status ? { status } : {};
    return this.prisma.booking.findMany({
      where,
      include: { user: true, packageDate: { include: { package: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { user: true, packageDate: { include: { package: true } }, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  updateBookingStatus(id: string, status: string) {
    return this.prisma.booking.update({ where: { id }, data: { status } });
  }

  // KYC
  getKycList(status?: string) {
    const where = status ? { kycStatus: status } : { kycStatus: 'pending' };
    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, kycStatus: true, kycDocs: true },
    });
  }

  async getUserKyc(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, kycStatus: true, kycDocs: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async approveKyc(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'approved' }
    });
  }

  async rejectKyc(userId: string, reason?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'rejected' }
    });
  }

  // Payments
  getPayments(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.startDate && query.endDate) {
      where.createdAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }
    return this.prisma.payment.findMany({
      where,
      include: { booking: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processRefund(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.prisma.payment.update({ where: { id }, data: { status: 'refunded' } });
    return { message: 'Refund processed', refundId: `re_${Date.now()}` };
  }

  // Reports
  async getDashboardStats() {
    const [totalUsers, totalPackages, totalBookings, totalRevenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.package.count(),
      this.prisma.booking.count(),
      this.prisma.payment.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),
    ]);
    const pendingKyc = await this.prisma.user.count({ where: { kycStatus: 'pending' } });
    const recentBookings = await this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: true, packageDate: { include: { package: true } } },
    });
    return { totalUsers, totalPackages, totalBookings, totalRevenue: totalRevenue._sum.amount || 0, pendingKyc, recentBookings };
  }

  async getRevenueReport(startDate?: string, endDate?: string) {
    const where: any = { status: 'completed' };
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    const payments = await this.prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' } });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    return { totalRevenue, count: payments.length, payments };
  }

  async getBookingReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    const bookings = await this.prisma.booking.findMany({ where });
    const statusCounts = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalBookings: bookings.length, statusCounts, bookingsByMonth: [] };
  }

  // Users
  getUsers(status?: string, role?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        kycStatus: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            packageDate: {
              include: { package: true }
            },
            payment: true
          },
          orderBy: { createdAt: 'desc' }
        },
        kycDocs: true,
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
