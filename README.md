# MCP Shield

[![MCPize](https://mcpize.com/badge/@utpal.uoda/mcp-shield)](https://mcpize.com/mcp/mcp-shield)

A production-grade, monetisable MCP (Model Context Protocol) server SaaS product that provides AI agents and LLM orchestrators with a secure, observable, policy-enforced proxy layer.

## Features

- 🔒 **Security**: PII scanning, prompt injection detection, and secret leakage protection
- 📋 **Policy Enforcement**: Flexible policy rules for blocking domains, rate limiting, and access control
- 📊 **Observability**: Comprehensive audit logging with request/response tracking
- 🚦 **Rate Limiting**: Redis-based sliding window rate limiting per API key
- 🔄 **SSE Support**: Server-Sent Events for real-time bidirectional communication
- 💰 **Monetisation**: Usage-based billing and tiered pricing (Free/Pro/Enterprise)
- 🛡️ **MCP Compliant**: Full implementation of MCP 2024-11-05 specification

## Tech Stack

- **Runtime**: Node.js 20 LTS, NestJS 10, TypeScript 5
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache**: Redis 7 (ioredis)
- **Protocol**: MCP spec 2024-11-05 (JSON-RPC 2.0)
- **Auth**: API key (x-api-key) and OAuth2/JWT support

## Tools

### 1. proxy.call
Securely proxy HTTP requests to external APIs with policy enforcement and logging.

**Parameters:**
- `url` (required): The target URL
- `method` (required): GET, POST, PUT, DELETE, PATCH
- `headers`: Optional HTTP headers
- `body`: Optional request body
- `timeout`: Request timeout (default: 10000ms)

### 2. logs.get
Retrieve audit logs for your API key with filtering and pagination.

**Parameters:**
- `limit`: Number of results (default: 50, max: 200)
- `offset`: Pagination offset (default: 0)
- `tool`: Filter by tool name
- `from`: Filter by start date (ISO 8601)
- `to`: Filter by end date (ISO 8601)
- `status`: Filter by status (success, error, blocked)

### 3. policy.set
Create or update security policies for your API key.

**Parameters:**
- `name` (required): Policy name
- `rule` (required):
  - `type`: block_domain, rate_limit, require_header, redact_field, allow_only
  - `value`: Policy-specific value
  - `enabled`: Enable/disable policy (default: true)
  - `priority`: Priority (lower = higher priority, default: 100)

### 4. security.scan
Analyze payloads for security issues before executing tool calls.

**Parameters:**
- `payload` (required): String or object to scan
- `checks`: Array of checks (default: prompt_injection, pii, policy)
  - prompt_injection: Detect jailbreak attempts
  - pii: Detect emails, phones, SSNs, credit cards
  - malicious_url: Check against blocklist
  - secret_leakage: Detect API keys and secrets
  - policy: Check for restricted terms

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-shield

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Using Docker Compose (Recommended)

```bash
# Start all services
npm run docker:up

# Run database migrations
docker exec -it mcp-shield-app npm run prisma:migrate

# View logs
docker-compose logs -f app
```

### Manual Setup

```bash
# Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mcp_shield postgres:15-alpine

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

## Connect via MCPize

Use this MCP server instantly with no local installation:

```bash
npx -y mcpize connect @utpal.uoda/mcp-shield --client claude
```

Or connect at: **https://mcpize.com/mcp/mcp-shield**

## Configuration

Environment variables (see `.env.example`):

```env
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_shield

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
API_KEY_SALT=change_me_32_char_random_string

# Rate limits
RATE_LIMIT_FREE=60
RATE_LIMIT_PRO=600

# Security scan
SCAN_BLOCKLIST_SEED=malware.com,phishing.org

# MCPize marketplace
MCPIZE_WEBHOOK_SECRET=whsec_...
```

## API Endpoints

- `GET /tools` - Get MCP server manifest (no auth required)
- `POST /call` - Execute a tool call (auth required)
- `GET /sse` - Open SSE connection (auth required)
- `POST /sse/message` - Send message via SSE (auth required)
- `GET /health` - Health check endpoint

## Authentication

### API Key Authentication

Include the `x-api-key` header with your API key:

```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/tools
```

### OAuth2/JWT Authentication

Include the `Authorization: Bearer <token>` header:

```bash
curl -H "Authorization: Bearer your-jwt-token" http://localhost:3000/tools
```

## Rate Limiting

Rate limits are enforced per API key using a Redis sliding window:

- **Free**: 60 requests/minute
- **Pro**: 600 requests/minute
- **Enterprise**: Unlimited

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Your limit
- `X-RateLimit-Remaining`: Remaining requests
- `Retry-After`: Seconds until reset

## Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm test -- --coverage
```

## Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm run start:prod
```

## Docker Deployment

```bash
# Build production image
docker build -f docker/Dockerfile -t mcp-shield .

# Run with docker-compose
docker-compose -f docker/docker-compose.yml up -d
```

## MCPize Marketplace

This server is ready for publication to the MCPize marketplace. See `mcpize.json` for marketplace metadata.

## License

Proprietary - All rights reserved

## Support

For support and documentation, visit the MCP Shield documentation portal.