import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import type { Plan } from '@prisma/client';

interface UsageStats {
    totalCalls: number;
    byTool: Record<string, number>;
}

@Injectable()
export class UsageService {
    private readonly logger = new Logger(UsageService.name);
    private readonly USAGE_TTL = 60 * 60; // 1 hour in seconds

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) { }

    async increment(tenantId: string, tool: string): Promise<void> {
        const month = new Date().toISOString().slice(0, 7); // "2025-04"
        const key = `shield:usage:${tenantId}:${month}`;

        try {
            // Increment counter atomically - fire and forget for performance
            await this.redis.hincrby(key, tool, 1);
            await this.redis.expire(key, this.USAGE_TTL);
        } catch (error) {
            this.logger.error(`Failed to increment usage for tenant ${tenantId}:`, error);
        }
    }

    @Cron(CronExpression.EVERY_HOUR)
    async flushToDB(): Promise<void> {
        this.logger.log('Starting hourly usage flush to database');
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const tenantIds = await this.getTenantIdsWithUsage();

            for (const tenantId of tenantIds) {
                const key = `shield:usage:${tenantId}:${currentMonth}`;
                const usageData = await this.redis.hgetall(key);

                if (Object.keys(usageData).length === 0) {
                    continue;
                }

                const totalCalls = Object.values(usageData).reduce(
                    (sum, val) => sum + parseInt(val, 10),
                    0,
                );

                // Upsert UsageStat
                await this.prisma.usageStat.upsert({
                    where: {
                        tenantId_month: {
                            tenantId,
                            month: currentMonth,
                        },
                    },
                    update: {
                        callCount: { increment: totalCalls },
                        toolBreakdown: { increment: usageData },
                    },
                    create: {
                        tenantId,
                        month: currentMonth,
                        callCount: totalCalls,
                        toolBreakdown: usageData,
                    },
                });

                this.logger.log(`Flushed usage for tenant ${tenantId}: ${totalCalls} calls`);

                // Clean up Redis after successful flush
                await this.redis.del(key);
            }

            this.logger.log('Hourly usage flush completed');
        } catch (error) {
            this.logger.error('Failed to flush usage to database:', error);
        }
    }

    async checkPlanLimit(tenantId: string, plan: Plan): Promise<void> {
        if (plan === 'ENTERPRISE') {
            return;
        }

        const month = new Date().toISOString().slice(0, 7);
        const stat = await this.prisma.usageStat.findUnique({
            where: {
                tenantId_month: { tenantId, month },
            },
        });

        const limit = plan === 'FREE' ? 500 : 10_000;
        const currentUsage = stat?.callCount ?? 0;

        if (currentUsage >= limit) {
            this.logger.warn(
                `Tenant ${tenantId} exceeded plan limit: ${currentUsage}/${limit}`,
            );
            throw new Error(
                `Plan upgrade required. You have used ${currentUsage} of ${limit} calls for this month.`,
            );
        }
    }

    async getUsageStats(tenantId: string, month?: string): Promise<UsageStats> {
        const targetMonth = month ?? new Date().toISOString().slice(0, 7);
        const stat = await this.prisma.usageStat.findUnique({
            where: {
                tenantId_month: { tenantId, month: targetMonth },
            },
        });

        if (!stat) {
            return { totalCalls: 0, byTool: {} };
        }

        const byTool = stat.toolBreakdown as Record<string, number>;
        return {
            totalCalls: stat.callCount,
            byTool: byTool ?? {},
        };
    }

    private async getTenantIdsWithUsage(): Promise<string[]> {
        const pattern = 'shield:usage:*:*';
        const keys = await this.redis.keys(pattern);
        const tenantIds = new Set<string>();

        for (const key of keys) {
            const parts = key.split(':');
            if (parts.length >= 3 && parts[2]) {
                tenantIds.add(parts[2]);
            }
        }

        return Array.from(tenantIds);
    }
}