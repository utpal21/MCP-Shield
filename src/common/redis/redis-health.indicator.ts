import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from './redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    constructor(private readonly redis: RedisService) {
        super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const client = this.redis.getClient();
            if (!client) {
                return this.getStatus(key, false, { message: 'Redis client is not connected' });
            }
            await client.ping();
            return this.getStatus(key, true);
        } catch (error) {
            return this.getStatus(key, false, { message: (error as Error).message });
        }
    }
}