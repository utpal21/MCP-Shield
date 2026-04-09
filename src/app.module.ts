import { Module } from '@nestjs/common';
import { McpModule } from './mcp/mcp.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { SecurityModule } from './security/security.module';
import { PolicyModule } from './policy/policy.module';
import { LoggingModule } from './logging/logging.module';
import { AuthModule } from './auth/auth.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { UsageModule } from './usage/usage.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { ConfigModule } from './config/config.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        RedisModule,
        SecurityModule,
        PolicyModule,
        LoggingModule,
        AuthModule,
        RateLimitModule,
        UsageModule,
        WebhooksModule,
        AdminModule,
        HealthModule,
        McpModule,
    ],
})
export class AppModule { }
