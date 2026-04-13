# MCP Tools Discovery Fix

## Issue
MCP discovery was timing out after 30000ms with no tools discovered.

### Error Report
```
Discovery: MCP request timed out after 30000ms

Quality Report: mcp-shield (MCP Security Proxy)
🔴 CRITICAL: No tools discovered — server exposes no functionality
```

## Root Causes

### 1. Incorrect tools/list Response Format
The `tools/list` endpoint was returning the entire manifest instead of just the tools array.

**Before (Wrong):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": { ... },
    "tools": [ ... ]
  }
}
```

**After (Correct - MCP Protocol):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [ ... ]
  }
}
```

According to MCP protocol specification, `tools/list` must return only the tools array in the result object, not the full manifest.

## Solution

### Updated tools/list Handler

```typescript
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
```

## Available Tools

The server now properly exposes 4 tools:

### 1. proxy.call
**Description**: Securely proxy a tool call to an external API endpoint. Applies policy rules and logs transaction.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["url", "method"],
  "properties": {
    "url": { "type": "string", "format": "uri" },
    "method": { 
      "type": "string", 
      "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"] 
    },
    "headers": { 
      "type": "object", 
      "additionalProperties": { "type": "string" } 
    },
    "body": { "type": ["object", "string", "null"] },
    "timeout": { 
      "type": "integer", 
      "default": 10000, 
      "minimum": 1000, 
      "maximum": 30000 
    }
  }
}
```

### 2. logs.get
**Description**: Retrieve audit logs for this API key. Supports pagination and time-range filtering.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "limit": { "type": "integer", "default": 50, "maximum": 200 },
    "offset": { "type": "integer", "default": 0 },
    "tool": { "type": "string" },
    "from": { "type": "string", "format": "date-time" },
    "to": { "type": "string", "format": "date-time" },
    "status": { 
      "type": "string", 
      "enum": ["success", "error", "blocked"] 
    }
  }
}
```

### 3. policy.set
**Description**: Create or update a security policy rule applied to all subsequent tool calls for this API key.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["name", "rule"],
  "properties": {
    "name": { "type": "string" },
    "rule": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "block_domain", 
            "rate_limit", 
            "require_header", 
            "redact_field", 
            "allow_only"
          ]
        },
        "value": { "type": ["string", "number", "array"] },
        "enabled": { "type": "boolean", "default": true },
        "priority": { "type": "integer", "default": 100 }
      }
    }
  }
}
```

### 4. security.scan
**Description**: Analyse a payload for prompt injection, PII leakage, or policy violations before executing a tool call.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["payload"],
  "properties": {
    "payload": { "type": ["string", "object"] },
    "checks": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "prompt_injection", 
          "pii", 
          "policy", 
          "malicious_url", 
          "secret_leakage"
        ]
      },
      "default": ["prompt_injection", "pii", "policy"]
    }
  }
}
```

## MCP Protocol Flow

### 1. Initialize (No Auth)
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "initialize"
     }' \
     https://mcp-shield.mcpize.run/mcp
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "mcp-shield",
      "version": "1.0.0"
    }
  }
}
```

### 2. Tools List (Auth Required)
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "jsonrpc": "2.0",
       "id": 2,
       "method": "tools/list"
     }' \
     https://mcp-shield.mcpize.run/mcp
```

Response (Now Fixed):
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "proxy.call",
        "description": "...",
        "inputSchema": { ... }
      },
      {
        "name": "logs.get",
        "description": "...",
        "inputSchema": { ... }
      },
      {
        "name": "policy.set",
        "description": "...",
        "inputSchema": { ... }
      },
      {
        "name": "security.scan",
        "description": "...",
        "inputSchema": { ... }
      }
    ]
  }
}
```

### 3. Tool Call (Auth Required)
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{
       "jsonrpc": "2.0",
       "id": 3,
       "method": "tools/call",
       "params": {
         "name": "proxy.call",
         "arguments": {
           "url": "https://api.example.com/data",
           "method": "GET"
         }
       }
     }' \
     https://mcp-shield.mcpize.run/mcp
```

## Deployment Steps

### Step 1: Commit Changes
```bash
git add .
git commit -m "fix: return correct tools/list format for MCP discovery"
git push
```

### Step 2: Redeploy
```bash
# Option 1: Git push (auto-redeploy if enabled)
git push

# Option 2: MCPize CLI
mcpize deploy

# Option 3: Dashboard
# Go to MCPize Dashboard > mcp-shield > Redeploy
```

### Step 3: Verify Discovery
After redeployment, MCP discovery should succeed:

1. Go to MCPize Dashboard
2. Find your mcp-shield server
3. Click "Trigger Discovery" or wait for auto-discovery
4. Should see: ✅ 4 tools discovered

Expected discovery result:
- ✅ Tools: 4 (proxy.call, logs.get, policy.set, security.scan)
- ✅ Capabilities: tools {}
- ✅ Protocol: streamable_http
- ✅ No timeouts

## Troubleshooting

### If Discovery Still Fails

1. Check logs: `mcpize logs --follow`
2. Verify `/mcp` endpoint is accessible:
   ```bash
   curl https://mcp-shield.mcpize.run/mcp
   ```
3. Test tools/list manually with valid API key
4. Ensure all environment variables are set

### If Tools Still Not Discovered

1. Verify response format matches MCP protocol
2. Check that `result.tools` array contains valid tool objects
3. Ensure each tool has `name`, `description`, and `inputSchema`
4. Test with MCP client locally first

## Files Modified

- `src/mcp/mcp.controller.ts` - Fixed `tools/list` to return correct format

## Summary

✅ **Fixed tools/list response format** - Returns only tools array as per MCP protocol
✅ **All 4 tools properly exposed** - proxy.call, logs.get, policy.set, security.scan
✅ **Discovery should succeed** - No more timeouts
✅ **Backward compatible** - Legacy routes still work
✅ **Build successful** - Ready for deployment

---

**Status**: Fixed and ready for redeployment! 🚀

After redeployment, MCP discovery should successfully discover all 4 tools.