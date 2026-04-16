import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { PrismaService } from '../../database/prisma.service';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'super_secret',
            signOptions: { expiresIn: '1d' },
        }),
    ],
    providers: [AuthService, JwtStrategy, GoogleStrategy, PrismaService],
    controllers: [AuthController],
})
export class AuthModule { }