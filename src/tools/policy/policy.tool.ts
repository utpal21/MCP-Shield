import { Injectable, BadRequestException } from '@nestjs/common';
import { PolicyService } from '../../policy/policy.service';
import { CreatePolicyDto } from '../../policy/policy.dto';
import { EnforcedPolicy } from '../../policy/policy.service';

export interface PolicySetArgs {
    name: string;
    rule: {
        type: string;
        value?: any;
        enabled?: boolean;
        priority?: number;
    };
}

@Injectable()
export class PolicyToolService {
    constructor(private policyService: PolicyService) { }

    async set(tenantId: string, args: PolicySetArgs): Promise<EnforcedPolicy> {
        if (!args.name || !args.rule || !args.rule.type) {
            throw new BadRequestException('Policy name and rule type are required');
        }

        // Validate rule type
        const validTypes = ['block_domain', 'rate_limit', 'require_header', 'redact_field', 'allow_only'];
        if (!validTypes.includes(args.rule.type)) {
            throw new BadRequestException(`Invalid rule type. Must be one of: ${validTypes.join(', ')}`);
        }

        const dto: CreatePolicyDto = {
            name: args.name,
            rule: {
                type: args.rule.type,
                value: args.rule.value,
                enabled: args.rule.enabled ?? true,
                priority: args.rule.priority ?? 100,
            },
        };

        return this.policyService.create(tenantId, dto);
    }
}