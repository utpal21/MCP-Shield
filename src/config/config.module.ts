import { Module } from '@nestjs/common';
import { ConfigurationService } from './configuration';

@Module({
    providers: [ConfigurationService],
    exports: [ConfigurationService],
})
export class ConfigModule { }