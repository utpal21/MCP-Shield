import { Module } from '@nestjs/common';
import { ProxyToolService } from './proxy/proxy.tool';
import { LogsToolService } from './logs/logs.tool';
import { PolicyToolService } from './policy/policy.tool';
import { SecurityToolService } from './security/security.tool';
import { PolicyModule } from '../policy/policy.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
    imports: [PolicyModule, LoggingModule],
    providers: [
        ProxyToolService,
        LogsToolService,
        PolicyToolService,
        SecurityToolService,
    ],
    exports: [
        ProxyToolService,
        LogsToolService,
        PolicyToolService,
        SecurityToolService,
    ],
})
export class ToolsModule { }