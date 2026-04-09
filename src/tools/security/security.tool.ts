import { Injectable } from '@nestjs/common';
import { SecurityService, SecurityScanResult } from '../../security/security.service';

export interface SecurityScanArgs {
    payload: string | object;
    checks?: string[];
}

@Injectable()
export class SecurityToolService {
    constructor(private security: SecurityService) { }

    async scan(args: SecurityScanArgs): Promise<SecurityScanResult> {
        if (!args.payload) {
            return {
                safe: true,
                findings: [],
            };
        }

        const checks = args.checks || ['prompt_injection', 'pii', 'policy'];
        return this.security.scan(args.payload, checks);
    }
}