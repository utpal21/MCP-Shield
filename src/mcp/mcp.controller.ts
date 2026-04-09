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
@UseGuards(CombinedAuthGuard)
export class McpController {
    constructor(
        private mcpService: McpService,
        private sseService: SSEService,
    ) { }

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