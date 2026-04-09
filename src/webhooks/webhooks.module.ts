import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ConfigModule } from '../config/config.module';

@Module({
    imports: [PrismaModule, ConfigModule],
    controllers: [WebhooksController],
})
export class WebhooksModule { }
