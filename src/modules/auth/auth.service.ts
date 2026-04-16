import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { EmailService } from '../../common/services/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private redisCache: RedisCacheService,
        private emailService: EmailService,
    ) {}

    async requestOtp(email: string) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // OTP valid for 5 minutes
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        // Find or create user
        // We use upsert-like logic but since we need to handle "create if new" logic specifically for OTP,
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            await this.prisma.user.create({
                data: {
                    email,
                    verified: false,
                },
            });
        }

        await this.redisCache.storeOtp(email, otp, 300);
        await this.emailService.sendOtpEmail(email, otp);
        return { message: 'OTP sent to email successfully' };
    }

    async verifyOtp(email: string, otp: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const storedOtp = await this.redisCache.getOtp(email);
        if (!storedOtp) {
            throw new UnauthorizedException('OTP expired or not found');
        }
        if (storedOtp !== otp) {
            throw new UnauthorizedException('Invalid OTP');
        }

        await this.redisCache.deleteOtp(email);
        // OTP is valid
        // Clear OTP and set verified
        const updatedUser = await this.prisma.user.update({
            where: { email },
            data: {
                verified: true,
            },
        });

        return this.generateToken(updatedUser);
    }

    public generateToken(user: any) {
        return {
            accessToken: this.jwtService.sign({
                sub: user.id,
                email: user.email,
                role: user.role,
            }),
            user: {
                id: user.id,
                email: user.email,
                verified: user.verified,
                role: user.role,
            }
        };
    }

    async validateGoogleUser(details: { email: string; name: string; avatar: string; googleId: string }) {
        const user = await this.prisma.user.findUnique({ where: { email: details.email } });

        if (user) {
            // Update user with google info if not present
            if (!user.googleId) {
                await this.prisma.user.update({
                    where: { email: details.email },
                    data: {
                        googleId: details.googleId,
                        name: details.name,
                        avatar: details.avatar,
                        verified: true, // Google verified email
                    },
                });
            }
            return user;
        }

        const newUser = await this.prisma.user.create({
            data: {
                email: details.email,
                name: details.name,
                avatar: details.avatar,
                googleId: details.googleId,
                verified: true,
            },
        });

        return newUser;
    }

    async loginAdmin(body: { email: string; password: string }) {
        const user = await this.prisma.user.findUnique({ where: { email: body.email } });

        if (!user || user.role !== 'ADMIN') {
            throw new UnauthorizedException('Invalid credentials or not an admin');
        }

        if (!user.password) {
            throw new UnauthorizedException('Admin password not set');
        }

        const isMatch = await bcrypt.compare(body.password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateToken(user);
    }
}