import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  @Post('initiate')
  initiate(@Req() req, @Body() body: CreateBookingDto) {
    return this.bookingsService.initiateBooking(req.user.userId, body);
  }

  @Get(':id')
  getBooking(@Req() req, @Param('id') id: string) {
    return this.bookingsService.getBookingById(req.user.userId, id);
  }

  @Patch(':id/cancel')
  cancelBooking(@Req() req, @Param('id') id: string) {
    return this.bookingsService.cancelBooking(req.user.userId, id);
  }
}
