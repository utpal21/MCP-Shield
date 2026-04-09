import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { UsageModule } from '../usage/usage.module';

@Module({
    imports: [PrismaModule, UsageModule],
    controllers: [AdminController],
})
export class AdminModule { }
