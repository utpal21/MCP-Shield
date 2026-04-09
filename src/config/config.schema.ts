import { z } from 'zod';

export const configSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().min(1),
    JWT_ISSUER: z.string().min(1),
    API_KEY_SALT: z.string().min(32),
    CORS_ORIGINS: z
        .string()
        .default('https://*.mcpize.run,http://localhost:3000')
        .transform((s) => s.split(',')),
    ALLOWED_ORIGINS: z
        .string()
        .default('https://*.mcpize.run,http://localhost:3000')
        .transform((s) => s.split(',')),
    MCPIZE_WEBHOOK_SECRET: z.string().min(16),
    RATE_LIMIT_FREE: z.coerce.number().default(60),
    RATE_LIMIT_PRO: z.coerce.number().default(600),
    SCAN_BLOCKLIST_DOMAINS: z
        .string()
        .default('')
        .transform((s) => (s ? s.split(',') : [])),
});

export type AppConfig = z.infer<typeof configSchema>;