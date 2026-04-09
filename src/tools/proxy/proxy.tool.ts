import { Injectable, BadRequestException } from '@nestjs/common';
import { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { PolicyService } from '../../policy/policy.service';
import axios, { AxiosRequestConfig } from 'axios';

export interface ProxyCallArgs {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
}

@Injectable()
export class ProxyToolService {
    constructor(private policyService: PolicyService) { }

    async call(user: CurrentUserData, args: ProxyCallArgs): Promise<any> {
        // Validate arguments
        if (!args.url || !args.method) {
            throw new BadRequestException('URL and method are required');
        }

        // Enforce policy rules
        const policyResult = await this.policyService.enforce(
            user.tenantId,
            'proxy.call',
            args,
        );

        if (policyResult.blocked) {
            const error = new Error(policyResult.reason) as any;
            error.code = -32000;
            error.status = 403;
            throw error;
        }

        // Prepare request config
        const config: AxiosRequestConfig = {
            method: args.method,
            url: args.url,
            timeout: args.timeout || 10000,
            headers: this.sanitizeHeaders(args.headers),
        };

        if (args.body && ['POST', 'PUT', 'PATCH'].includes(args.method)) {
            config.data = args.body;
        }

        try {
            const response = await axios(config);
            return {
                status: response.status,
                headers: response.headers,
                data: response.data,
            };
        } catch (error: any) {
            if (error.response) {
                // Server responded with error status
                const err = new Error('Upstream API error') as any;
                err.code = -32000;
                err.status = error.response.status;
                err.data = {
                    upstreamStatus: error.response.status,
                    upstreamData: error.response.data,
                };
                throw err;
            } else if (error.request) {
                // Request made but no response
                const err = new Error('Upstream API timeout or connection error') as any;
                err.code = -32000;
                err.status = 504;
                throw err;
            } else {
                // Error in request setup
                const err = new Error('Invalid request configuration') as any;
                err.code = -32000;
                err.status = 400;
                throw err;
            }
        }
    }

    private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
        if (!headers) {
            return {};
        }

        // Remove sensitive headers that could override auth
        const sanitized = { ...headers };
        delete sanitized['authorization'];
        delete sanitized['x-api-key'];
        delete sanitized['cookie'];
        delete sanitized['set-cookie'];

        return sanitized;
    }
}