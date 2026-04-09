import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { RedisModule } from '../common/redis/redis.module';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
    imports: [RedisModule, PrismaModule],
    providers: [SecurityService],
    exports: [SecurityService],
})
export class SecurityModule { }