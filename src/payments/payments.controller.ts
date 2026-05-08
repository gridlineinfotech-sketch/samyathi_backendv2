import { Controller, Post, Get, Body, Param, Headers, UseGuards, Req } from '@nestjs/common';
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
  webhook(@Req() req, @Body() body: any, @Headers('stripe-signature') signature?: string) {
    return this.paymentsService.webhook(body, signature, req.rawBody);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  getPayment(@Req() req, @Param('id') id: string) {
    return this.paymentsService.getPaymentById(req.user.userId, id);
  }
}
