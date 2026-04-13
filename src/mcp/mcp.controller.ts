import {
    Controller,
    Get,
    Post,
    UseGuards,
    Req,
    Res,
    Body,
    Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { CombinedAuthGuard } from '../auth/auth.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SSEService } from './sse/sse.service';

@Controller()
export class McpController {
    constructor(
        private mcpService: McpService,
        private sseService: SSEService,
    ) { }

    // Root MCP endpoint - for MCPize compatibility (expects /)
    @Post('/')
    async handleRootMcpRequest(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() body: any,
        @CurrentUser() user: any,
    ) {
        // Delegate to existing MCP handler
        return this.handleMcpRequest(req, res, body, user);
    }

    // /mcp endpoint - for backward compatibility and direct access
    @Post('mcp')
    async handleMcpRequest(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() body: any,
        @CurrentUser() user: any,
    ) {
        // Validate JSON-RPC request
        const validation = await this.mcpService.validateRequest(body);
        if (!validation.valid) {
            return res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32600,
                    message: validation.error,
                },
                id: body.id || null,
            });
        }

        // Handle different MCP methods
        switch (body.method) {
            case 'initialize':
                // Initialize connection - return server info (no auth/Redis required)
                return res.status(200).json({
                    jsonrpc: '2.0',
                    id: body.id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                        },
                        serverInfo: {
                            name: 'mcp-shield',
                            version: '1.0.0',
                        },
                    },
                });

            case 'tools/list':
                // For tools/list, check if user is authenticated
                if (!user) {
                    return res.status(401).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32001,
                            message: 'Unauthorized',
                        },
                        id: body.id || null,
                    });
                }
                // Return only tools array (MCP protocol requires this format)
                return res.status(200).json({
                    jsonrpc: '2.0',
                    id: body.id,
                    result: {
                        tools: this.mcpService.getManifest().tools,
                    },
                });

            case 'tools/call':
                // For tool calls, user must be authenticated and pass rate limit
                if (!user) {
                    return res.status(401).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32001,
                            message: 'Unauthorized',
                        },
                        id: body.id || null,
                    });
                }
                // For tool calls, body.params contains tool name and arguments
                const response = await this.mcpService.handleToolCall(
                    user,
                    null,
                    body.params,
                    body.id,
                );
                const statusCode = response.error ? this.getStatusCode(response.error.code) : 200;
                return res.status(statusCode).json(response);

            default:
                return res.status(404).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32601,
                        message: `Method not found: ${body.method}`,
                    },
                    id: body.id || null,
                });
        }
    }

    @Get('tools')
    async getTools() {
        return this.mcpService.getManifest();
    }

    @Post('call')
    @UseGuards(RateLimitGuard)
    async callTool(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() body: any,
        @CurrentUser() user: any,
    ) {
        // Validate JSON-RPC request
        const validation = await this.mcpService.validateRequest(body);
        if (!validation.valid) {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32600,
                    message: validation.error,
                },
                id: body.id || null,
            });
            return;
        }

        // Handle tool call
        const response = await this.mcpService.handleToolCall(
            user,
            null,
            body.params,
            body.id,
        );

        const statusCode = response.error ? this.getStatusCode(response.error.code) : 200;
        return res.status(statusCode).json(response);
    }

    @Get('sse')
    @UseGuards(RateLimitGuard)
    async sse(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @CurrentUser() user: any,
    ) {
        // Create SSE session
        const sessionId = this.sseService.createSession(res, user.tenantId, user.apiKeyId);

        // Handle client disconnect
        req.on('close', () => {
            this.sseService.removeSession(sessionId);
        });

        // Keep connection open
        return new Promise<void>((resolve) => {
            // This promise will never resolve, keeping the connection open
            // until the client disconnects
        });
    }

    @Post('sse/message')
    async sseMessage(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() body: any,
        @Query('sessionId') sessionId: string,
    ) {
        // Get session
        const session = this.sseService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                jsonrpc: '2.0',
                error: {
                    code: -32600,
                    message: 'Session not found',
                },
                id: body.id || null,
            });
        }

        // Validate JSON-RPC request
        const validation = await this.mcpService.validateRequest(body);
        if (!validation.valid) {
            return res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32600,
                    message: validation.error,
                },
                id: body.id || null,
            });
        }

        // Handle tool call
        const response = await this.mcpService.handleToolCall(
            { tenantId: session.tenantId, apiKeyId: session.apiKeyId, plan: 'UNKNOWN' },
            sessionId,
            body.params,
            body.id,
        );

        const statusCode = response.error ? this.getStatusCode(response.error.code) : 200;
        return res.status(statusCode).json(response);
    }

    private getStatusCode(errorCode: number): number {
        switch (errorCode) {
            case -32700:
            case -32600:
                return 400;
            case -32601:
                return 404;
            case -32602:
                return 400;
            case -32000:
                return 500;
            default:
                return 500;
        }
    }
}