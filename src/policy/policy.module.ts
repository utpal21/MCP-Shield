import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
    imports: [PrismaModule, RedisModule],
    providers: [PolicyService],
    exports: [PolicyService],
})
export class PolicyModule { }