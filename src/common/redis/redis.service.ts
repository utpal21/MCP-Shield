import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigurationService } from '../../config/configuration';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client!: Redis;

    constructor(private readonly config: ConfigurationService) { }

    async onModuleInit(): Promise<void> {
        this.client = new Redis(this.config.get('REDIS_URL'));

        // Load blocklist seeds
        const blocklistSeed = this.config.get('SCAN_BLOCKLIST_DOMAINS');
        if (blocklistSeed && blocklistSeed.length > 0) {
            const domains = blocklistSeed.filter((d) => d.trim().length > 0);
            if (domains.length > 0) {
                await this.client.sadd('shield:blocklist:domains', ...domains);
                this.logger.log(`Loaded ${domains.length} domains to blocklist`);
            }
        }

        this.logger.log('Redis connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    getClient(): Redis {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.client.set(key, value, 'EX', ttl);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async sadd(key: string, ...members: string[]): Promise<number> {
        return this.client.sadd(key, ...members);
    }

    async sismember(key: string, member: string): Promise<boolean> {
        return (await this.client.sismember(key, member)) === 1;
    }

    async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
        return this.client.zremrangebyscore(key, min, max);
    }

    async zadd(key: string, score: number, member: string): Promise<number> {
        return this.client.zadd(key, score, member);
    }

    async zcard(key: string): Promise<number> {
        return this.client.zcard(key);
    }

    async expire(key: string, seconds: number): Promise<boolean> {
        return (await this.client.expire(key, seconds)) === 1;
    }

    async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async hincrby(key: string, field: string, increment: number): Promise<number> {
        return this.client.hincrby(key, field, increment);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.client.hgetall(key);
    }

    async keys(pattern: string): Promise<string[]> {
        return this.client.keys(pattern);
    }
}