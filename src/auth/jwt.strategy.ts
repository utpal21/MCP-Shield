import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUserData } from './decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKeyProvider: (request: unknown, rawJwtToken: unknown, done: (err: Error | null, publicKey?: string) => void) => {
                try {
                    const publicKey = config.get('JWT_PUBLIC_KEY');
                    if (!publicKey) {
                        return done(new Error('JWT public key not configured'), undefined);
                    }
                    done(null, publicKey);
                } catch (error) {
                    done(error instanceof Error ? error : new Error(String(error)), undefined);
                }
            },
            algorithms: ['RS256'],
        });
    }

    async validate(payload: any): Promise<CurrentUserData> {
        const tenantId = payload.sub || payload.tenant_id;
        if (!tenantId) {
            throw new UnauthorizedException('Invalid JWT token');
        }

        return {
            tenantId,
            apiKeyId: payload.apiKeyId || 'jwt-auth',
            plan: payload.plan || 'ENTERPRISE',
        };
    }
}