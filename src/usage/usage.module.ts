import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UsageService } from './usage.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
    imports: [PrismaModule, RedisModule, ScheduleModule.forRoot()],
    providers: [UsageService],
    exports: [UsageService],
})
export class UsageModule { }