import { Controller, Post, Body, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConfigurationService } from '../config/configuration';

interface McpizeWebhookPayload {
    event: 'plan.upgraded' | 'plan.downgraded' | 'tenant.created' | 'tenant.deleted';
    tenantId: string;
    data: {
        plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
        [key: string]: unknown;
    };
    timestamp: number;
}

interface RequestWithRawBody extends Request {
    rawBody?: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigurationService,
    ) { }

    @Post('mcpize')
    async handleMcpizeWebhook(
        @Body() payload: McpizeWebhookPayload,
        req: RequestWithRawBody,
    ): Promise<{ status: string }> {
        // Verify HMAC signature
        const sig = (req.headers.get('x-mcpize-signature') as string | undefined);
        if (!sig) {
            throw new UnauthorizedException('Missing signature');
        }

        const rawBody = (req as RequestWithRawBody).rawBody;
        if (!rawBody) {
            throw new UnauthorizedException('Missing request body');
        }

        const secret = this.config.getOrThrow('MCPIZE_WEBHOOK_SECRET');
        const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

        if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
            this.logger.warn('Invalid webhook signature');
            throw new UnauthorizedException('Invalid signature');
        }

        // Process webhook event
        this.logger.log(`Received webhook event: ${payload.event} for tenant ${payload.tenantId}`);

        try {
            switch (payload.event) {
                case 'plan.upgraded':
                case 'plan.downgraded':
                    await this.handlePlanChange(payload.tenantId, payload.data.plan);
                    break;
                case 'tenant.created':
                    await this.handleTenantCreated(payload.tenantId, payload.data);
                    break;
                case 'tenant.deleted':
                    await this.handleTenantDeleted(payload.tenantId);
                    break;
                default:
                    this.logger.warn(`Unknown webhook event: ${payload.event}`);
            }

            return { status: 'processed' };
        } catch (error) {
            this.logger.error(`Failed to process webhook:`, error);
            throw new ForbiddenException('Failed to process webhook');
        }
    }

    private async handlePlanChange(tenantId: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE' | undefined): Promise<void> {
        if (!plan) {
            this.logger.warn(`Plan change webhook missing plan for tenant ${tenantId}`);
            return;
        }

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { plan },
        });

        this.logger.log(`Updated tenant ${tenantId} plan to ${plan}`);
    }

    private async handleTenantCreated(tenantId: string, data: Record<string, unknown>): Promise<void> {
        // Verify tenant exists or create if needed
        const existing = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (existing) {
            this.logger.log(`Tenant ${tenantId} already exists`);
            return;
        }

        await this.prisma.tenant.create({
            data: {
                id: tenantId,
                name: (data['name'] as string) || 'Unknown',
                plan: (data['plan'] as 'FREE' | 'PRO' | 'ENTERPRISE') || 'FREE',
            },
        });

        this.logger.log(`Created tenant ${tenantId}`);
    }

    private async handleTenantDeleted(tenantId: string): Promise<void> {
        await this.prisma.tenant.delete({
            where: { id: tenantId },
        });

        this.logger.log(`Deleted tenant ${tenantId}`);
    }
}