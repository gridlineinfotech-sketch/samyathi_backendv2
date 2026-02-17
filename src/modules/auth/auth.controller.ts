import { Body, Controller, Post, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.OK)
    async register(@Body() body: any) {
        // Reuse requestOtp since it handles user creation if not exists
        return this.authService.requestOtp(body.email);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: { email: string }) {
        return this.authService.requestOtp(body.email);
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verify(@Body() body: { email: string; otp: string }) {
        return this.authService.verifyOtp(body.email, body.otp);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) {
        // Initiates Google OAuth sequence
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req) {
        return this.authService.generateToken(req.user);
    }
}