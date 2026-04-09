import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CurrentUserData } from './decorators/current-user.decorator';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {
        super(
            {
                header: 'x-api-key',
            },
            async (apiKey: string, done: (err: Error | null, user?: any, info?: any) => void) => {
                try {
                    const apiKeySalt = this.config.get('API_KEY_SALT');
                    if (!apiKeySalt) {
                        throw new Error('API_KEY_SALT not configured');
                    }
                    const hash = crypto
                        .createHmac('sha256', apiKeySalt)
                        .update(apiKey)
                        .digest('hex');

                    const apiKeyRecord = await this.prisma.apiKey.findUnique({
                        where: { key: hash },
                        include: { tenant: true },
                    });

                    if (!apiKeyRecord || !apiKeyRecord.active) {
                        return done(new Error('Invalid API key'), null);
                    }

                    const user: CurrentUserData = {
                        tenantId: apiKeyRecord.tenantId,
                        apiKeyId: apiKeyRecord.id,
                        plan: apiKeyRecord.tenant.plan,
                    };

                    // Update last used timestamp
                    await this.prisma.apiKey.update({
                        where: { id: apiKeyRecord.id },
                        data: { lastUsedAt: new Date() },
                    });

                    return done(null, user);
                } catch (error) {
                    return done(error instanceof Error ? error : new Error(String(error)), null);
                }
            },
        );
    }
}