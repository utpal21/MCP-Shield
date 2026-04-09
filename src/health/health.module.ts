import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { RedisHealthIndicator } from '../common/redis/redis-health.indicator';

@Module({
    imports: [TerminusModule, PrismaModule, RedisModule],
    controllers: [HealthController],
    providers: [RedisHealthIndicator],
})
export class HealthModule { }