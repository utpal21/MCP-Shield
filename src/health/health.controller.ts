import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../common/redis/redis-health.indicator';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller()
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prisma: PrismaService,
        private redis: RedisHealthIndicator,
    ) { }

    @Get('health')
    @HealthCheck()
    async check() {
        return this.health.check([
            async () => ({
                database: {
                    status: 'up',
                },
            }),
            () => this.redis.isHealthy('redis'),
        ]);
    }
}
