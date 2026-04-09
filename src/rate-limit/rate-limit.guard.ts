import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(private redis: RedisService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as CurrentUserData;

        // Skip rate limiting for enterprise plans
        if (user.plan === 'ENTERPRISE') {
            return true;
        }

        // Get rate limit based on plan (stored in request from AuthGuard)
        const rateLimit = request.rateLimit || 60;
        const apiKeyId = user.apiKeyId;

        // Check if limit exceeded
        const allowed = await this.checkLimit(apiKeyId, rateLimit);

        if (!allowed) {
            throw new HttpException(
                {
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Rate limit exceeded',
                    },
                    id: request.body?.id || null,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Set rate limit headers
        const currentCount = await this.getCurrentCount(apiKeyId);
        request.res.setHeader('X-RateLimit-Limit', rateLimit);
        request.res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit - currentCount));
        request.res.setHeader('Retry-After', '60');

        return true;
    }

    async checkLimit(apiKeyId: string, limitPerMinute: number): Promise<boolean> {
        const now = Date.now();
        const window = 60_000; // 1 minute
        const key = `shield:ratelimit:${apiKeyId}`;

        const client = this.redis.getClient();

        // Remove entries outside the window
        await client.zremrangebyscore(key, 0, now - window);

        // Add current request
        const member = `${now}-${Math.random()}`;
        await client.zadd(key, now, member);

        // Count requests in window
        const count = await client.zcard(key);

        // Set expiration
        await client.expire(key, 61);

        return count <= limitPerMinute;
    }

    async getCurrentCount(apiKeyId: string): Promise<number> {
        const key = `shield:ratelimit:${apiKeyId}`;
        return this.redis.zcard(key);
    }
}