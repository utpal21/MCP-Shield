export const MCP_SERVER_MANIFEST = {
    protocolVersion: '2024-11-05',
    serverInfo: {
        name: 'MCP Shield',
        version: '1.0.0',
    },
    tools: [
        {
            name: 'proxy.call',
            description: 'Securely proxy a tool call to an external API endpoint. Applies policy rules and logs the transaction.',
            inputSchema: {
                type: 'object',
                required: ['url', 'method'],
                properties: {
                    url: { type: 'string', format: 'uri' },
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                    headers: { type: 'object', additionalProperties: { type: 'string' } },
                    body: { type: ['object', 'string', 'null'] },
                    timeout: { type: 'integer', default: 10000, minimum: 1000, maximum: 30000 },
                },
            },
        },
        {
            name: 'logs.get',
            description: 'Retrieve audit logs for this API key. Supports pagination and time-range filtering.',
            inputSchema: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 50, maximum: 200 },
                    offset: { type: 'integer', default: 0 },
                    tool: { type: 'string' },
                    from: { type: 'string', format: 'date-time' },
                    to: { type: 'string', format: 'date-time' },
                    status: { type: 'string', enum: ['success', 'error', 'blocked'] },
                },
            },
        },
        {
            name: 'policy.set',
            description: 'Create or update a security policy rule applied to all subsequent tool calls for this API key.',
            inputSchema: {
                type: 'object',
                required: ['name', 'rule'],
                properties: {
                    name: { type: 'string' },
                    rule: {
                        type: 'object',
                        required: ['type'],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['block_domain', 'rate_limit', 'require_header', 'redact_field', 'allow_only'],
                            },
                            value: { type: ['string', 'number', 'array'] },
                            enabled: { type: 'boolean', default: true },
                            priority: { type: 'integer', default: 100 },
                        },
                    },
                },
            },
        },
        {
            name: 'security.scan',
            description: 'Analyse a payload for prompt injection, PII leakage, or policy violations before executing a tool call.',
            inputSchema: {
                type: 'object',
                required: ['payload'],
                properties: {
                    payload: { type: ['string', 'object'] },
                    checks: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: ['prompt_injection', 'pii', 'policy', 'malicious_url', 'secret_leakage'],
                        },
                        default: ['prompt_injection', 'pii', 'policy'],
                    },
                },
            },
        },
    ],
};