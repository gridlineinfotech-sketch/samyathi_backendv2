import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  initiate(@Req() req, @Body() body: { packageDateId: string; seats: number }) {
    return this.bookingsService.initiateBooking(req.user.userId, body);
  }
}
