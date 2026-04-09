import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigurationService } from '../../config/configuration';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis | null = null;

    constructor(private readonly config: ConfigurationService) { }

    async onModuleInit(): Promise<void> {
        const redisUrl = this.config.get('REDIS_URL');

        // Skip Redis initialization if URL is not provided (MCPize will provide it)
        if (!redisUrl) {
            this.logger.warn('REDIS_URL not configured - Redis features will be unavailable');
            this.client = null;
            return;
        }

        try {
            // Try to connect but don't fail if connection string is invalid
            this.client = new Redis(redisUrl);

            // Test connection with a simple PING
            await this.client.ping();

            // Load blocklist seeds only if connected successfully
            const blocklistSeed = this.config.get('SCAN_BLOCKLIST_DOMAINS');
            if (blocklistSeed && blocklistSeed.length > 0) {
                const domains = blocklistSeed.filter((d) => d.trim().length > 0);
                if (domains.length > 0) {
                    await this.client.sadd('shield:blocklist:domains', ...domains);
                    this.logger.log(`Loaded ${domains.length} domains to blocklist`);
                }
            }

            this.logger.log('Redis connected successfully');
        } catch (error: any) {
            this.logger.warn(`Redis connection failed: ${error.message}. Redis features will be unavailable.`);
            this.client = null;
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.logger.log('Redis disconnected');
        }
    }

    private ensureClient(): Redis {
        if (!this.client) {
            throw new Error('Redis is not connected. Features requiring Redis are unavailable.');
        }
        return this.client;
    }

    getClient(): Redis | null {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.ensureClient().get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.ensureClient().set(key, value, 'EX', ttl);
        } else {
            await this.ensureClient().set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.ensureClient().del(key);
    }

    async sadd(key: string, ...members: string[]): Promise<number> {
        return this.ensureClient().sadd(key, ...members);
    }

    async sismember(key: string, member: string): Promise<boolean> {
        return (await this.ensureClient().sismember(key, member)) === 1;
    }

    async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
        return this.ensureClient().zremrangebyscore(key, min, max);
    }

    async zadd(key: string, score: number, member: string): Promise<number> {
        return this.ensureClient().zadd(key, score, member);
    }

    async zcard(key: string): Promise<number> {
        return this.ensureClient().zcard(key);
    }

    async expire(key: string, seconds: number): Promise<boolean> {
        return (await this.ensureClient().expire(key, seconds)) === 1;
    }

    async incr(key: string): Promise<number> {
        return this.ensureClient().incr(key);
    }

    async hincrby(key: string, field: string, increment: number): Promise<number> {
        return this.ensureClient().hincrby(key, field, increment);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.ensureClient().hgetall(key);
    }

    async keys(pattern: string): Promise<string[]> {
        return this.ensureClient().keys(pattern);
    }
}