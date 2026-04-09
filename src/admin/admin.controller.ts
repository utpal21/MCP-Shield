import { Controller, Get, Query, UseGuards, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CombinedAuthGuard } from '../auth/auth.guard';

interface UsageSummary {
    tenantId: string;
    month: string;
    totalCalls: number;
    byTool: Record<string, number>;
}

@Controller('admin')
@UseGuards(CombinedAuthGuard)
export class AdminController {
    private readonly logger = new Logger(AdminController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly usage: UsageService,
    ) { }

    @Get('usage')
    @HttpCode(HttpStatus.OK)
    async getUsage(
        @CurrentUser('tenantId') tenantId: string,
        @Query('month') month?: string,
    ): Promise<UsageSummary> {
        this.logger.log(`Admin usage request for tenant ${tenantId}, month ${month}`);

        const stats = await this.usage.getUsageStats(tenantId, month);

        return {
            tenantId,
            month: month ?? new Date().toISOString().slice(0, 7),
            totalCalls: stats.totalCalls,
            byTool: stats.byTool,
        };
    }

    @Get('tenants')
    @HttpCode(HttpStatus.OK)
    async listTenants(
        @Query('limit') limit = '50',
        @Query('offset') offset = '0',
    ): Promise<{ total: number; items: Array<{ id: string; name: string; plan: string; createdAt: Date }> }> {
        const items = await this.prisma.tenant.findMany({
            take: Math.min(parseInt(limit, 10), 200),
            skip: Math.max(parseInt(offset, 10), 0),
            select: {
                id: true,
                name: true,
                plan: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const total = await this.prisma.tenant.count();

        return {
            total,
            items,
        };
    }
}