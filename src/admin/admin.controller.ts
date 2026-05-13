import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // Packages
  @Get('packages')
  getPackages() {
    return this.adminService.getPackages();
  }

  @Post('packages')
  createPackage(@Body() body: any) {
    return this.adminService.createPackage(body);
  }

  @Patch('packages/:id')
  updatePackage(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updatePackage(id, body);
  }

  @Delete('packages/:id')
  deletePackage(@Param('id') id: string) {
    return this.adminService.deletePackage(id);
  }

  // Package Dates
  @Post('package-dates')
  createPackageDate(@Body() body: any) {
    return this.adminService.createPackageDate(body);
  }

  @Patch('package-dates/:id')
  updatePackageDate(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updatePackageDate(id, body);
  }

  @Delete('package-dates/:id')
  deletePackageDate(@Param('id') id: string) {
    return this.adminService.deletePackageDate(id);
  }

  // Bookings
  @Get('bookings')
  getBookings(@Query('status') status?: string) {
    return this.adminService.getBookings(status);
  }

  @Get('bookings/:id')
  getBooking(@Param('id') id: string) {
    return this.adminService.getBooking(id);
  }

  @Patch('bookings/:id/status')
  updateBookingStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.adminService.updateBookingStatus(id, body.status);
  }

  // KYC
  @Get('kyc')
  getPendingKyc(@Query('status') status?: string) {
    return this.adminService.getKycList(status);
  }

  @Get('kyc/:userId')
  getUserKyc(@Param('userId') userId: string) {
    return this.adminService.getUserKyc(userId);
  }

  @Post('kyc/approve')
  approveKyc(@Body() body: { userId: string }) {
    return this.adminService.approveKyc(body.userId);
  }

  @Post('kyc/reject')
  rejectKyc(@Body() body: { userId: string; reason?: string }) {
    return this.adminService.rejectKyc(body.userId, body.reason);
  }

  // Payments
  @Get('payments')
  getPayments(@Query() query: any) {
    return this.adminService.getPayments(query);
  }

  @Post('payments/:id/refund')
  processRefund(@Param('id') id: string) {
    return this.adminService.processRefund(id);
  }

  // Reports
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // Users
  @Get('users')
  getUsers(@Query('status') status?: string, @Query('role') role?: string) {
    return this.adminService.getUsers(status, role);
  }

  @Get('users/:id')
  getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Get('reports/revenue')
  getRevenueReport(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.adminService.getRevenueReport(startDate, endDate);
  }

  @Get('reports/bookings')
  getBookingReport(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.adminService.getBookingReport(startDate, endDate);
  }
}
