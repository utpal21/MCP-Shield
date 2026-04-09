import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { CreatePolicyDto, UpdatePolicyDto, PolicyRule } from './policy.dto';

export interface EnforcedPolicy {
    id: string;
    name: string;
    ruleType: string;
    ruleValue: any;
    enabled: boolean;
    priority: number;
}

@Injectable()
export class PolicyService {
    private readonly POLICY_CACHE_PREFIX = 'shield:policy:';
    private readonly POLICY_CACHE_TTL = 60; // seconds

    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
    ) { }

    async create(tenantId: string, dto: CreatePolicyDto): Promise<EnforcedPolicy> {
        const policy = await this.prisma.policy.upsert({
            where: {
                tenantId_name: {
                    tenantId,
                    name: dto.name,
                },
            },
            update: {
                ruleType: dto.rule.type,
                ruleValue: dto.rule as any,
                enabled: dto.rule.enabled ?? true,
                priority: dto.rule.priority ?? 100,
            },
            create: {
                tenantId,
                name: dto.name,
                ruleType: dto.rule.type,
                ruleValue: dto.rule as any,
                enabled: dto.rule.enabled ?? true,
                priority: dto.rule.priority ?? 100,
            },
        });

        // Invalidate cache
        await this.invalidateCache(tenantId);

        return this.toEnforcedPolicy(policy);
    }

    async update(tenantId: string, name: string, dto: UpdatePolicyDto): Promise<EnforcedPolicy | null> {
        const policy = await this.prisma.policy.findUnique({
            where: {
                tenantId_name: {
                    tenantId,
                    name,
                },
            },
        });

        if (!policy) {
            return null;
        }

        const updateData: any = {};
        if (dto.rule !== undefined) {
            updateData.ruleType = dto.rule.type;
            updateData.ruleValue = dto.rule;
        }
        if (dto.enabled !== undefined) {
            updateData.enabled = dto.enabled;
        }
        if (dto.priority !== undefined) {
            updateData.priority = dto.priority;
        }

        const updated = await this.prisma.policy.update({
            where: {
                tenantId_name: {
                    tenantId,
                    name,
                },
            },
            data: updateData,
        });

        // Invalidate cache
        await this.invalidateCache(tenantId);

        return this.toEnforcedPolicy(updated);
    }

    async delete(tenantId: string, name: string): Promise<boolean> {
        const policy = await this.prisma.policy.findUnique({
            where: {
                tenantId_name: {
                    tenantId,
                    name,
                },
            },
        });

        if (!policy) {
            return false;
        }

        await this.prisma.policy.delete({
            where: {
                tenantId_name: {
                    tenantId,
                    name,
                },
            },
        });

        // Invalidate cache
        await this.invalidateCache(tenantId);

        return true;
    }

    async getAll(tenantId: string): Promise<EnforcedPolicy[]> {
        const cacheKey = `${this.POLICY_CACHE_PREFIX}${tenantId}`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const policies = await this.prisma.policy.findMany({
            where: { tenantId, enabled: true },
            orderBy: { priority: 'asc' },
        });

        const enforcedPolicies = policies.map(p => this.toEnforcedPolicy(p));

        // Cache for 60 seconds
        await this.redis.set(
            cacheKey,
            JSON.stringify(enforcedPolicies),
            this.POLICY_CACHE_TTL,
        );

        return enforcedPolicies;
    }

    async getOne(tenantId: string, name: string): Promise<EnforcedPolicy | null> {
        const policy = await this.prisma.policy.findUnique({
            where: {
                tenantId_name: {
                    tenantId,
                    name,
                },
            },
        });

        if (!policy) {
            return null;
        }

        return this.toEnforcedPolicy(policy);
    }

    async enforce(tenantId: string, tool: string, data: any): Promise<{ blocked: boolean; reason?: string }> {
        const policies = await this.getAll(tenantId);

        for (const policy of policies) {
            const result = this.evaluatePolicy(policy, tool, data);
            if (result.blocked) {
                return result;
            }
        }

        return { blocked: false };
    }

    private evaluatePolicy(policy: EnforcedPolicy, tool: string, data: any): { blocked: boolean; reason?: string } {
        const { ruleType, ruleValue } = policy;

        switch (ruleType) {
            case 'block_domain':
                if (data.url) {
                    try {
                        const url = new URL(data.url);
                        const blockedDomains = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
                        if (blockedDomains.includes(url.hostname)) {
                            return {
                                blocked: true,
                                reason: `Domain ${url.hostname} is blocked by policy "${policy.name}"`,
                            };
                        }
                    } catch (e) {
                        // Invalid URL, skip
                    }
                }
                break;

            case 'rate_limit':
                // This is handled by RateLimitGuard, but we can still enforce it here
                break;

            case 'require_header':
                if (data.headers && ruleValue) {
                    const requiredHeaders = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
                    for (const header of requiredHeaders) {
                        if (!data.headers[header]) {
                            return {
                                blocked: true,
                                reason: `Missing required header "${header}" per policy "${policy.name}"`,
                            };
                        }
                    }
                }
                break;

            case 'redact_field':
                if (data.body && ruleValue) {
                    const fieldsToRedact = Array.isArray(ruleValue) ? ruleValue : [ruleValue];
                    for (const field of fieldsToRedact) {
                        if (data.body[field]) {
                            return {
                                blocked: true,
                                reason: `Field "${field}" is blocked by policy "${policy.name}"`,
                            };
                        }
                    }
                }
                break;

            case 'allow_only':
                if (ruleValue && ruleValue.domains && data.url) {
                    try {
                        const url = new URL(data.url);
                        const allowedDomains = Array.isArray(ruleValue.domains)
                            ? ruleValue.domains
                            : [ruleValue.domains];
                        if (!allowedDomains.includes(url.hostname)) {
                            return {
                                blocked: true,
                                reason: `Domain ${url.hostname} is not in allow list for policy "${policy.name}"`,
                            };
                        }
                    } catch (e) {
                        // Invalid URL, skip
                    }
                }
                if (ruleValue && ruleValue.tools && !ruleValue.tools.includes(tool)) {
                    return {
                        blocked: true,
                        reason: `Tool "${tool}" is not allowed by policy "${policy.name}"`,
                    };
                }
                break;
        }

        return { blocked: false };
    }

    private async invalidateCache(tenantId: string): Promise<void> {
        const cacheKey = `${this.POLICY_CACHE_PREFIX}${tenantId}`;
        await this.redis.del(cacheKey);
    }

    private toEnforcedPolicy(policy: any): EnforcedPolicy {
        return {
            id: policy.id,
            name: policy.name,
            ruleType: policy.ruleType,
            ruleValue: policy.ruleValue,
            enabled: policy.enabled,
            priority: policy.priority,
        };
    }
}