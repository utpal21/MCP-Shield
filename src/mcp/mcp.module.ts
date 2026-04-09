import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { SSEService } from './sse/sse.service';
import { ToolsModule } from '../tools/tools.module';
import { AuthModule } from '../auth/auth.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
    imports: [ToolsModule, AuthModule, RateLimitModule, LoggingModule],
    controllers: [McpController],
    providers: [McpService, SSEService],
    exports: [McpService, SSEService],
})
export class McpModule { }