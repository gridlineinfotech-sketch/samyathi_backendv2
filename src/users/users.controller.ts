import { Controller, Get, Patch, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('me')
  updateProfile(@Req() req, @Body() body: { name?: string; phone?: string; avatar?: string }) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Get('me/bookings')
  getMyBookings(@Req() req) {
    return this.usersService.getMyBookings(req.user.userId);
  }

  @Get('me/notifications')
  getMyNotifications(@Req() req) {
    return this.usersService.getMyNotifications(req.user.userId);
  }

  @Delete('me')
  deleteAccount(@Req() req) {
    return this.usersService.deleteAccount(req.user.userId);
  }
}
