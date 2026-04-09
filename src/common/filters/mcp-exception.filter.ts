import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class MCPExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception instanceof HttpException ? exception.message : 'Internal server error';

        // Map to MCP error codes
        const mcpErrorCode = this.mapToMCPError(status, exception);

        const mcpResponse = {
            jsonrpc: '2.0',
            error: {
                code: mcpErrorCode,
                message: message,
                data: exception instanceof HttpException ? exception.getResponse() : null,
            },
            id: request.body?.id || null,
        };

        response.status(status).json(mcpResponse);
    }

    private mapToMCPError(status: number, exception: any): number {
        if (exception.code && typeof exception.code === 'number') {
            return exception.code;
        }

        switch (status) {
            case HttpStatus.BAD_REQUEST:
                return -32600; // Invalid Request
            case HttpStatus.UNAUTHORIZED:
                return -32600; // Invalid Request (auth)
            case HttpStatus.NOT_FOUND:
                return -32601; // Method not found
            case HttpStatus.TOO_MANY_REQUESTS:
                return -32000; // Server error (rate limit)
            default:
                return -32000; // Server error
        }
    }
}