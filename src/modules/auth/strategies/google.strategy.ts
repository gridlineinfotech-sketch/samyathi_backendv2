import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private authService: AuthService) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
            callbackURL: 'http://localhost:3000/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { name, emails, photos, id } = profile;
        const user = await this.authService.validateGoogleUser({
            email: emails[0].value,
            name: name.givenName + ' ' + name.familyName,
            avatar: photos[0].value,
            googleId: id,
        });
        done(null, user);
    }
}
