import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyStrategy } from './api-key.strategy';
import { JwtStrategy } from './jwt.strategy';
import { CombinedAuthGuard } from './auth.guard';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
    imports: [PassportModule, ConfigModule, PrismaModule],
    providers: [ApiKeyStrategy, JwtStrategy, CombinedAuthGuard],
    exports: [CombinedAuthGuard],
})
export class AuthModule { }