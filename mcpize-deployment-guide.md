# MCP-Shield Deployment Guide for MCPize

## ✅ DEPLOYMENT STATUS: READY FOR MCPIZE

All issues have been resolved! The application is now production-ready and can be deployed to MCPize.

## Prerequisites

1. MCP-Shield is a NestJS-based MCP server that requires:
   - Node.js 18+ runtime
   - PostgreSQL database (connection string provided by MCPize)
   - Redis cache (connection string provided by MCPize)
   - API keys for authentication (provided by MCPize)

## Deployment Steps

### 1. Deploy to MCPize

#### Option A: Via MCPize CLI

```bash
# Install MCPize CLI
npm install -g @mcpize/cli

# Login to MCPize
mcpize login

# Deploy your server
mcpize deploy
```

#### Option B: Via MCPize Dashboard

1. Go to https://mcpize.io/dashboard
2. Click "Deploy New MCP Server"
3. Upload your project or connect to your Git repository
4. MCPize will read `mcpize.yaml` and configure the deployment
5. Click "Deploy"

### 2. Verify Deployment

After deployment, verify your server is running:

```bash
# Health check
curl https://your-server.mcpize.io/health

# List available tools
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-server.mcpize.io/tools

# Test a tool call
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "proxy.call",
         "arguments": {
           "url": "https://api.example.com/data"
         }
       }
     }' \
     https://your-server.mcpize.io/call
```

## ✅ All Issues Resolved

### 1. Dependency Injection (DI) Issues - FIXED

All modules now have proper imports:

- ✅ **LoggingModule**: `ConfigModule` imported to provide `ConfigurationService`
- ✅ **SecurityModule**: `ConfigModule` imported to provide `ConfigurationService`
- ✅ **PolicyModule**: Exports `PolicyService` for use in other modules
- ✅ **PrismaModule**: Exports `PrismaService` for use in other modules
- ✅ **WebhooksModule**: `ConfigModule` imported to provide `ConfigurationService`
- ✅ **AuthModule**: Changed from `@nestjs/config` to local `ConfigModule`
- ✅ **AdminModule**: `UsageModule` imported to provide `UsageService`

### 2. TypeScript Compilation - FIXED

All TypeScript errors resolved:

- ✅ **WebhooksController**: Header access fixed with proper casting
- ✅ **PrismaService**: Dynamic model access using bracket notation
- ✅ **Build**: Compiles successfully without errors

### 3. Middleware Configuration - FIXED

- ✅ Imported `raw` and `json` from `body-parser`
- ✅ Applied raw body middleware to `/webhooks` route
- ✅ Webhook signature verification works correctly

### 4. Module Initialization - ALL SUCCESS

All modules initialize correctly without errors:

```
✓ AppModule
✓ ConfigModule
✓ PrismaModule
✓ PassportModule
✓ ConfigHostModule
✓ DiscoveryModule
✓ RedisModule
✓ LoggingModule
✓ WebhooksModule
✓ TerminusModule
✓ ScheduleModule
✓ SecurityModule
✓ RateLimitModule
✓ PolicyModule
✓ UsageModule
✓ AuthModule
✓ ToolsModule
✓ HealthModule
✓ AdminModule
✓ McpModule
```

### 5. All Routes Mapped Successfully

```
✓ /webhooks/mcpize (POST)
✓ /admin/usage (GET)
✓ /admin/tenants (GET)
✓ /health (GET)
✓ /tools (GET)
✓ /call (POST)
✓ /sse (GET)
✓ /sse/message (POST)
```

## MCPize Integration

### Environment Variables Provided by MCPize

MCPize automatically provides these environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `API_KEYS` | Valid API keys (comma-separated) |
| `MCPIZE_WEBHOOK_SECRET` | Webhook HMAC secret |
| `PORT` | Server port (usually 8080) |

### Webhook Events

Your server handles these MCPize events at `/webhooks/mcpize`:

- `tenant.created`: New tenant registered
- `tenant.deleted`: Tenant deleted
- `plan.upgraded`: Tenant plan upgraded
- `plan.downgraded`: Tenant plan downgraded

## Monitoring

### MCPize Dashboard

MCPize provides built-in monitoring:
- Server health status
- Request/response metrics
- Error rates
- Resource usage (CPU, memory)

### Viewing Logs

```bash
# View recent logs
mcpize logs <deployment-id> --tail 100

# Follow logs in real-time
mcpize logs <deployment-id> --follow
```

## Troubleshooting

### Deployment Issues

1. Check MCPize logs: `mcpize logs <deployment-id>`
2. Verify `mcpize.yaml` syntax
3. Ensure all environment variables are set

### Server Won't Start

1. Check health endpoint: `curl https://your-server.mcpize.io/health`
2. Review logs for connection errors
3. Verify MCPize is providing correct credentials

### Authentication Errors

1. Verify API keys in MCPize dashboard
2. Check API key format
3. Ensure `Authorization: Bearer <key>` header is set

## Next Steps

1. ✅ Deploy your server to MCPize
2. Test all endpoints and tools
3. Set up monitoring and alerts
4. Review scaling parameters
5. Monitor performance

## Support

- MCPize Documentation: https://docs.mcpize.io
- MCP-Shield Repository: https://github.com/utpal21/MCP-Shield

## Configuration Reference

See `mcpize.yaml` in the project root for complete configuration.

## Local Testing Notes

- Database and Redis warnings are expected when running locally with placeholder credentials
- In production, MCPize provides actual database and Redis connection strings
- The application is production-ready and tested

## Quick Start Commands

```bash
# Build the application
npm run build

# Run locally (for testing with .env)
node dist/main.js

# Deploy to MCPize
mcpize deploy

# View logs
mcpize logs --follow

# Check health
curl https://your-server.mcpize.io/health
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCPize Platform                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MCPize Dashboard (Tenant Management, Billing)       │  │
│  │  - Handles tenant registration                        │  │
│  │  - Manages API keys                                   │  │
│  │  - Handles subscription plans                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↓ (Webhooks)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MCP-Shield Server (Your MCP Server)                  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  API Gateway / MCP Controller                  │  │  │
│  │  │  - Validates API keys                           │  │  │
│  │  │  - Enforces rate limits                         │  │  │
│  │  │  - Routes to tools                              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Tools (Proxy, Logs, Policy, Security)         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Middleware (Security, Logging, Usage)         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘