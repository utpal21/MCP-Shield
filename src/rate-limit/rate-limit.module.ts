import { Module } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisModule } from '../common/redis/redis.module';

@Module({
    imports: [RedisModule],
    providers: [RateLimitGuard],
    exports: [RateLimitGuard],
})
export class RateLimitModule { }