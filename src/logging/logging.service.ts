import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LogStatus } from '@prisma/client';
import * as crypto from 'crypto';

export interface AuditLogData {
    tenantId: string;
    apiKeyId: string;
    tool: string;
    requestHash: string;
    statusCode?: number;
    status: LogStatus;
    latencyMs?: number;
    details?: any;
}

export interface LogQuery {
    limit?: number;
    offset?: number;
    tool?: string;
    from?: Date;
    to?: Date;
    status?: LogStatus;
}

@Injectable()
export class LoggingService {
    constructor(private prisma: PrismaService) { }

    async create(data: AuditLogData) {
        return this.prisma.auditLog.create({
            data,
        });
    }

    async query(tenantId: string, query: LogQuery = {}) {
        const {
            limit = 50,
            offset = 0,
            tool,
            from,
            to,
            status,
        } = query;

        const where: any = { tenantId };

        if (tool) {
            where.tool = tool;
        }

        if (from || to) {
            where.createdAt = {};
            if (from) {
                where.createdAt.gte = from;
            }
            if (to) {
                where.createdAt.lte = to;
            }
        }

        if (status) {
            where.status = status;
        }

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                take: Math.min(limit, 200),
                skip: offset,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            total,
            items,
            hasMore: offset + items.length < total,
        };
    }

    generateRequestHash(data: any): string {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    async logToolCall(
        tenantId: string,
        apiKeyId: string,
        tool: string,
        requestData: any,
        statusCode?: number,
        status: LogStatus = 'success',
        latencyMs?: number,
        details?: any,
    ) {
        const requestHash = this.generateRequestHash(requestData);

        await this.create({
            tenantId,
            apiKeyId,
            tool,
            requestHash,
            statusCode,
            status,
            latencyMs,
            details,
        });
    }
}