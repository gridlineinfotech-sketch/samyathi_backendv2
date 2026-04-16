import { Controller, Post, Get, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post('packages')
  createPackage(@Body() body: any) {
    return this.adminService.createPackage(body);
  }

  @Post('package-dates')
  createPackageDate(@Body() body: any) {
    return this.adminService.createPackageDate(body);
  }

  @Get('bookings')
  getBookings() {
    return this.adminService.getBookings();
  }

  @Post('kyc/approve')
  approveKyc(@Body() body: { userId: string }) {
    return this.adminService.approveKyc(body.userId);
  }
}
