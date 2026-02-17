import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  initiate(@Req() req, @Body() body: { bookingId: string }) {
    return this.paymentsService.initiatePayment(req.user.userId, body.bookingId);
  }

  @Post('webhook')
  webhook(@Body() body: any) {
    return this.paymentsService.webhook(body);
  }
}
