import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { MCPExceptionFilter } from './common/filters/mcp-exception.filter';
import { ConfigurationService } from './config/configuration';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // Get configuration
    const config = app.get(ConfigurationService);

    // Helmet - HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'none'"],
                    connectSrc: ["'self'"],
                },
            },
            hsts: { maxAge: 31536000, includeSubDomains: true },
            noSniff: true,
            frameguard: { action: 'deny' },
            referrerPolicy: { policy: 'no-referrer' },
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: { policy: 'same-origin' },
        }),
    );

    // CORS allowlist
    const corsOrigins = config.get('CORS_ORIGINS');
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
            } else if (corsOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('CORS origin not allowed'), false);
            }
        },
        methods: ['GET', 'POST', 'DELETE'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'x-api-key',
            'Accept',
            'Mcp-Session-Id',
            'X-Mcpize-Signature',
        ],
        exposedHeaders: [
            'Mcp-Session-Id',
            'MCP-Protocol-Version',
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'Retry-After',
        ],
        credentials: true,
    });

    // Raw body middleware for webhooks (must be before json parser)
    (app as any).use('/webhooks', express.raw({ type: 'application/json', limit: '256kb' }), (req: Request, _res: Response, next: NextFunction) => {
        (req as any).rawBody = req.body;
        next();
    });

    // Request body size limit
    app.use(express.json({ limit: '256kb' }));

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: false },
            stopAtFirstError: false,
        }),
    );

    // Global exception filter for MCP errors
    app.useGlobalFilters(new MCPExceptionFilter());

    // Start server - MCPize injects PORT at runtime
    const port = config.get('PORT');
    await app.listen(port, '0.0.0.0');

    logger.log(`MCP Shield v1.0.0 listening on :${port}`);
    logger.log(`MCP endpoint: http://localhost:${port}/mcp`);
    logger.log(`Health endpoint: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
});
