import { configSchema, type AppConfig } from './config.schema';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load environment variables
config();

@Injectable()
export class ConfigurationService {
    private readonly logger = new Logger(ConfigurationService.name);
    private readonly config: AppConfig;

    constructor() {
        try {
            this.config = configSchema.parse(process.env);
            this.logger.log('Configuration validated successfully');
        } catch (error) {
            this.logger.error('Configuration validation failed:', error);
            process.exit(1);
        }
    }

    get<T extends keyof AppConfig>(key: T): AppConfig[T] {
        return this.config[key];
    }

    getOrThrow<T extends keyof AppConfig>(key: T): AppConfig[T] {
        const value = this.config[key];
        if (value === undefined || value === null) {
            throw new Error(`Missing required configuration: ${String(key)}`);
        }
        return value;
    }

    isDevelopment(): boolean {
        return this.config.NODE_ENV === 'development';
    }

    isProduction(): boolean {
        return this.config.NODE_ENV === 'production';
    }

    isTest(): boolean {
        return this.config.NODE_ENV === 'test';
    }
}