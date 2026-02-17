import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private transporter: nodemailer.Transporter;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {
        // Initialize transporter
        // In production, use environment variables for real SMTP config
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',

            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'ethereal_user',
                pass: process.env.SMTP_PASS || 'ethereal_pass'
            }
        });
    }

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
                    otp,
                    otpExpires,
                    verified: false,
                },
            });
        } else {
            await this.prisma.user.update({
                where: { email },
                data: {
                    otp,
                    otpExpires,
                },
            });
        }

        await this.sendEmail(email, otp);

        return { message: 'OTP sent to email successfully' };
    }

    async verifyOtp(email: string, otp: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.otp !== otp) {
            throw new UnauthorizedException('Invalid OTP');
        }

        if (user.otpExpires && user.otpExpires < new Date()) {
            throw new UnauthorizedException('OTP expired');
        }

        // OTP is valid
        // Clear OTP and set verified
        const updatedUser = await this.prisma.user.update({
            where: { email },
            data: {
                otp: null,
                otpExpires: null,
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
            }),
            user: {
                id: user.id,
                email: user.email,
                verified: user.verified
            }
        };
    }

    private async sendEmail(email: string, otp: string) {
        // Log OTP to console for development/testing
        this.logger.log(`=============================================`);
        this.logger.log(`Generated OTP for ${email}: ${otp}`);
        this.logger.log(`=============================================`);

        try {
            // Only attempt to send if config exists or just try and fail gracefully
            if (process.env.SMTP_HOST) {
                await this.transporter.sendMail({
                    from: '"Pilgrim App" <no-reply@pilgrim.com>',
                    to: email,
                    subject: 'Your Login OTP',
                    text: `Your OTP code is: ${otp}`,
                    html: `<p>Your OTP code is: <b>${otp}</b></p>`,
                });
                this.logger.log(`Email sent to ${email}`);
            } else {
                this.logger.warn('SMTP_HOST not set. Email not sent via network. Check console for OTP.');
            }
        } catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
        }
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
}