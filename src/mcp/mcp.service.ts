import { Injectable, BadRequestException } from '@nestjs/common';
import { MCP_SERVER_MANIFEST } from './mcp-schema';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ProxyToolService } from '../tools/proxy/proxy.tool';
import { LogsToolService } from '../tools/logs/logs.tool';
import { PolicyToolService } from '../tools/policy/policy.tool';
import { SecurityToolService } from '../tools/security/security.tool';
import { LoggingService } from '../logging/logging.service';
import { SSEService } from './sse/sse.service';

interface MCPToolCall {
    name: string;
    arguments: any;
}

interface MCPRequest {
    jsonrpc: string;
    id: string | number;
    method: string;
    params?: any;
}

interface MCPResponse {
    jsonrpc: string;
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

@Injectable()
export class McpService {
    constructor(
        private proxyTool: ProxyToolService,
        private logsTool: LogsToolService,
        private policyTool: PolicyToolService,
        private securityTool: SecurityToolService,
        private logging: LoggingService,
        private sseService: SSEService,
    ) { }

    getManifest() {
        return MCP_SERVER_MANIFEST;
    }

    async handleToolCall(
        user: CurrentUserData,
        sessionId: string | null,
        toolCall: MCPToolCall,
        requestId: string | number,
    ): Promise<MCPResponse> {
        const startTime = Date.now();
        let result: any;
        let error: any = null;
        let statusCode: number | undefined;
        let status: any = 'success';

        try {
            // Route to appropriate tool
            switch (toolCall.name) {
                case 'proxy.call':
                    result = await this.proxyTool.call(user, toolCall.arguments);
                    break;
                case 'logs.get':
                    result = await this.logsTool.get(user.tenantId, toolCall.arguments);
                    break;
                case 'policy.set':
                    result = await this.policyTool.set(user.tenantId, toolCall.arguments);
                    break;
                case 'security.scan':
                    result = await this.securityTool.scan(toolCall.arguments);
                    break;
                default:
                    throw new BadRequestException(`Unknown tool: ${toolCall.name}`);
            }

            statusCode = 200;
        } catch (err: any) {
            error = err;
            statusCode = err.status || 500;
            status = 'error';

            if (err.message?.includes('blocked')) {
                status = 'blocked';
            }

            // Log error details
            result = {
                error: {
                    message: err.message,
                    code: err.code || -32000,
                },
            };
        } finally {
            // Log the tool call
            const latencyMs = Date.now() - startTime;
            await this.logging.logToolCall(
                user.tenantId,
                user.apiKeyId,
                toolCall.name,
                toolCall.arguments,
                statusCode,
                status,
                latencyMs,
            );

            // Increment usage counter for monetization
            await this.incrementUsage(user.tenantId);
        }

        // Prepare MCP response
        const response: MCPResponse = {
            jsonrpc: '2.0',
            id: requestId,
        };

        if (error) {
            response.error = {
                code: error.code || -32000,
                message: error.message || 'Server error',
                data: error.data,
            };
        } else {
            response.result = {
                content: [
                    {
                        type: typeof result === 'object' ? 'json' : 'text',
                        [typeof result === 'object' ? 'json' : 'text']: result,
                    },
                ],
            };
        }

        // If sessionId provided, send via SSE
        if (sessionId) {
            this.sseService.send(sessionId, 'message', response);
        }

        return response;
    }

    async validateRequest(request: MCPRequest): Promise<{ valid: boolean; error?: string }> {
        if (!request.jsonrpc || request.jsonrpc !== '2.0') {
            return { valid: false, error: 'Invalid JSON-RPC version' };
        }

        if (request.id === undefined) {
            return { valid: false, error: 'Missing request ID' };
        }

        if (!request.method) {
            return { valid: false, error: 'Missing method' };
        }

        if (request.method === 'tools/call') {
            if (!request.params?.name) {
                return { valid: false, error: 'Missing tool name' };
            }
        }

        return { valid: true };
    }

    private async incrementUsage(tenantId: string): Promise<void> {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const key = `shield:usage:${tenantId}:${monthKey}`;

        // This will be handled by Redis service
        // For now, we'll just log it
        // In production, you'd increment a Redis counter for billing
    }
}