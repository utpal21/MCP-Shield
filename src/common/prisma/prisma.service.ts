import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private isConnected = false;

    constructor() {
        super();
    }

    async onModuleInit() {
        // Try to connect but don't fail if connection string is invalid
        try {
            await this['$connect']();
            this.isConnected = true;
            this.logger.log('Database connected successfully');
        } catch (error: any) {
            // If connection string is placeholder, log warning but don't crash
            if (error.message?.includes('placeholder') || error.code === 'P1001') {
                this.logger.warn('Database connection failed - using placeholder or invalid URL. Will retry on first query.');
            } else {
                this.logger.warn(`Database connection failed: ${error.message}. Will retry on first query.`);
            }
        }
    }

    async onModuleDestroy() {
        if (this.isConnected) {
            await this['$disconnect']();
            this.isConnected = false;
            this.logger.log('Database disconnected');
        }
    }

    private async ensureConnected() {
        if (!this.isConnected) {
            try {
                await this['$connect']();
                this.isConnected = true;
                this.logger.log('Database connected successfully');
            } catch (error: any) {
                this.logger.error('Failed to connect to database:', error.message);
                throw error;
            }
        }
    }
}
