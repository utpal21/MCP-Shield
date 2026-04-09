import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SecurityFinding {
    check: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detail: string;
}

export interface SecurityScanResult {
    safe: boolean;
    findings: SecurityFinding[];
}

@Injectable()
export class SecurityService {
    constructor(
        private redis: RedisService,
        private prisma: PrismaService,
    ) { }

    async scan(payload: string | object, checks: string[] = ['prompt_injection', 'pii', 'policy']): Promise<SecurityScanResult> {
        const findings: SecurityFinding[] = [];
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

        if (checks.includes('prompt_injection')) {
            findings.push(...this.checkPromptInjection(payloadStr));
        }

        if (checks.includes('pii')) {
            findings.push(...this.checkPII(payloadStr));
        }

        if (checks.includes('malicious_url')) {
            findings.push(...await this.checkMaliciousURL(payloadStr));
        }

        if (checks.includes('secret_leakage')) {
            findings.push(...this.checkSecretLeakage(payloadStr));
        }

        if (checks.includes('policy')) {
            findings.push(...this.checkPolicy(payloadStr));
        }

        return {
            safe: findings.filter(f => f.severity === 'critical' || f.severity === 'high').length === 0,
            findings,
        };
    }

    private checkPromptInjection(payload: string): SecurityFinding[] {
        const findings: SecurityFinding[] = [];
        const patterns = [
            'ignore previous instructions',
            'you are now',
            'DAN',
            'jailbreak',
            'system prompt',
            'reveal your system prompt',
            'override your instructions',
            'forget everything',
            'act as',
            'pretend you are',
            'developer mode',
            'unrestricted',
        ];

        const lowerPayload = payload.toLowerCase();
        for (const pattern of patterns) {
            if (lowerPayload.includes(pattern.toLowerCase())) {
                findings.push({
                    check: 'prompt_injection',
                    severity: 'high',
                    detail: `Detected potential prompt injection pattern: "${pattern}"`,
                });
                break;
            }
        }

        return findings;
    }

    private checkPII(payload: string): SecurityFinding[] {
        const findings: SecurityFinding[] = [];

        // Email pattern
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = payload.match(emailRegex);
        if (emails && emails.length > 0) {
            findings.push({
                check: 'pii',
                severity: 'medium',
                detail: `Detected ${emails.length} potential email address(es)`,
            });
        }

        // Phone number (E.164 format)
        const phoneRegex = /\+?[1-9]\d{1,14}\b/g;
        const phones = payload.match(phoneRegex);
        if (phones && phones.length > 0) {
            findings.push({
                check: 'pii',
                severity: 'medium',
                detail: `Detected ${phones.length} potential phone number(s)`,
            });
        }

        // SSN pattern (US format)
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
        const ssns = payload.match(ssnRegex);
        if (ssns && ssns.length > 0) {
            findings.push({
                check: 'pii',
                severity: 'high',
                detail: `Detected ${ssns.length} potential SSN(s)`,
            });
        }

        // Credit card pattern (Luhn algorithm check would be better)
        const ccRegex = /\b(?:\d[ -]*?){13,16}\b/g;
        const ccs = payload.match(ccRegex);
        if (ccs && ccs.length > 0) {
            findings.push({
                check: 'pii',
                severity: 'high',
                detail: `Detected ${ccs.length} potential credit card number(s)`,
            });
        }

        return findings;
    }

    private async checkMaliciousURL(payload: string): Promise<SecurityFinding[]> {
        const findings: SecurityFinding[] = [];
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = payload.match(urlRegex);

        if (urls && urls.length > 0) {
            for (const url of urls) {
                try {
                    const urlObj = new URL(url);
                    const domain = urlObj.hostname;
                    const isBlocked = await this.redis.sismember('shield:blocklist:domains', domain);

                    if (isBlocked) {
                        findings.push({
                            check: 'malicious_url',
                            severity: 'critical',
                            detail: `URL contains blocked domain: ${domain}`,
                        });
                    }
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        }

        return findings;
    }

    private checkSecretLeakage(payload: string): SecurityFinding[] {
        const findings: SecurityFinding[] = [];
        const patterns = [
            { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key', severity: 'critical' as const },
            { pattern: /sk-[a-zA-Z0-9]{32,}/g, name: 'OpenAI API Key', severity: 'critical' as const },
            { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token', severity: 'critical' as const },
            { pattern: /pk_live_[a-zA-Z0-9]{24,}/g, name: 'Stripe Live API Key', severity: 'critical' as const },
            { pattern: /ya29\.[a-zA-Z0-9_-]{100,}/g, name: 'Google OAuth Token', severity: 'critical' as const },
        ];

        for (const { pattern, name, severity } of patterns) {
            const matches = payload.match(pattern);
            if (matches && matches.length > 0) {
                findings.push({
                    check: 'secret_leakage',
                    severity,
                    detail: `Detected ${matches.length} potential ${name}(s)`,
                });
            }
        }

        return findings;
    }

    private checkPolicy(payload: string): SecurityFinding[] {
        const findings: SecurityFinding[] = [];
        // Basic policy violation checks
        const restrictedTerms = ['password', 'token', 'secret', 'api_key', 'private_key'];

        const lowerPayload = payload.toLowerCase();
        for (const term of restrictedTerms) {
            if (lowerPayload.includes(term)) {
                findings.push({
                    check: 'policy',
                    severity: 'low',
                    detail: `Contains potentially sensitive term: "${term}"`,
                });
                break;
            }
        }

        return findings;
    }
}