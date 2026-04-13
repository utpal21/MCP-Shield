# MCPize Dashboard Configuration - Complete Setup Guide

## 🎯 The Main Issue

**MCPize is trying to discover at `/` instead of `/mcp`**

This is a **dashboard configuration problem** - you need to change the Endpoint URL in MCPize settings.

---

## 📋 Step-by-Step MCPize Dashboard Configuration

### Step 1: Change Endpoint URL (CRITICAL!)

1. Go to: https://mcpize.com/developer/servers/mcp-shield/settings
2. Find the **"Endpoint URL"** field
3. **Change from**: `https://mcp-shield.mcpize.run/` (WRONG)
4. **Change to**: `https://mcp-shield.mcpize.run/mcp` (CORRECT)
5. Click **Save**

### Step 2: Verify Transport Type

1. Still on settings page
2. Find **"Transport"** field
3. Set to: `streamable_http`
4. Click **Save** if needed

### Step 3: Configure Credentials

Your server supports **two authentication methods**:

#### Option A: API Key (Recommended for Testing)

1. Generate an API key using your server's admin panel or API
2. In MCPize dashboard > Settings > Credentials
3. Select: `api_key`
4. Add your generated API key
5. Click **Save**

#### Option B: OAuth2 (Recommended for Production)

1. In MCPize dashboard > Settings > Credentials
2. Select: `oauth2`
3. Configure:
   - Issuer URL: `https://auth.mcpize.com`
   - JWT Verification: Public Key (provided below)
4. Click **Save**

### Step 4: Configure Secrets

Go to: https://mcpize.com/developer/servers/mcp-shield/settings

#### REQUIRED Secrets (Must Set Manually)

##### 1. API_KEY_SALT
```
5c254e5ac6023072d632689d334e3d4eb4a54fe4d9bb6e22b427a41985adc34f
```

##### 2. JWT_PUBLIC_KEY
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn4z2gAnX84+lazlkIIYs
l9soqrt2PgZHt5lS0F+u0ydY/mrZ8oL6IbWUaXJ2MH/uY6aufMkTrmDlAwbh47X3
eXns3WsddBd2XJTqaDijPeZS1hlVDWTNJXlh1mZEHQJPhTGq7pq8a6Jvc4zr+pEE
4KsIp5VDBSAzEWqCBgdft3vwWYSmYxnoZkNA7GALd/C/PhmdEJ+O/zx8aBjxSU28
AkuSpg9iq5WEvKGJieZPgGFwE90xHBcwb2MtGRaxGE+DgQdl7D0RM7XFklzn3DwJ
9TZ1RSU+ZIHaLvuDlGyrKwJMRjnD5yXVdrwnjQxUKXCms3GSoy5gM7gVp13ri2AX
zwIDAQAB
-----END PUBLIC KEY-----
```

##### 3. JWT_ISSUER
```
https://auth.mcpize.com
```

#### AUTO-PROVIDED Secrets (DO NOT SET)

The following are automatically provided by MCPize - **do NOT add them manually**:

- ❌ `DATABASE_URL` - MCPize provides this automatically
- ❌ `REDIS_URL` - MCPize provides this automatically
- ❌ `MCPIZE_WEBHOOK_SECRET` - Appears in dashboard after first deploy

#### OPTIONAL Secrets (Recommended)

##### 4. CORS_ORIGINS
```
https://*.mcpize.run,https://mcpize.com
```

##### 5. ALLOWED_ORIGINS
```
mcp-shield.mcpize.run
```

##### 6. SCAN_BLOCKLIST_DOMAINS
```
malware.com,phishing.org,scam-site.net
```

### Step 5: Save & Redeploy

1. Click **Save** on settings page
2. Click **Redeploy** button
3. Wait for deployment to complete (usually 1-2 minutes)
4. Check logs for errors: `mcpize logs --follow`

---

## ✅ Verification Steps

### Test 1: Health Check
```bash
curl https://mcp-shield.mcpize.run/health
```

**Expected**: `{"status":"ok",...}`

### Test 2: Initialize (No Auth Needed)
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

**Expected**: 
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "serverInfo": {"name": "mcp-shield", "version": "1.0.0"}
  }
}
```

### Test 3: Tools List (With Auth)
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

**Expected**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "proxy.call",
        "description": "...",
        "inputSchema": {...}
      },
      {
        "name": "logs.get",
        ...
      },
      {
        "name": "policy.set",
        ...
      },
      {
        "name": "security.scan",
        ...
      }
    ]
  }
}
```

### Test 4: Trigger Discovery

1. Go to MCPize Dashboard
2. Find mcp-shield server
3. Click **"Trigger Discovery"**
4. Wait for completion (should be <10 seconds)
5. **Expected**: ✅ 4 tools discovered

---

## 🔍 Troubleshooting MCPize Discovery Issues

### Issue: Discovery Returns 404

**Cause**: Endpoint URL is set to `/` instead of `/mcp`

**Solution**:
1. Go to MCPize Settings
2. Change Endpoint URL from `https://mcp-shield.mcpize.run/` 
   to `https://mcp-shield.mcpize.run/mcp`
3. Save and redeploy

### Issue: Discovery Returns 401

**Cause**: Authentication not configured or invalid credentials

**Solution**:
1. Go to MCPize Settings > Credentials
2. Configure either:
   - API Key (add your generated key)
   - OAuth2 (configure JWT settings)
3. Save and redeploy

### Issue: Discovery Returns 503

**Cause**: Server secrets not configured

**Solution**:
1. Go to MCPize Settings > Secrets
2. Add all required secrets:
   - API_KEY_SALT
   - JWT_PUBLIC_KEY
   - JWT_ISSUER
3. Save and redeploy

### Issue: Discovery Times Out After 30s

**Cause**: Server still has Redis blocking (old code)

**Solution**:
1. Ensure latest code is deployed (with async Redis)
2. Check logs: `mcpize logs --follow`
3. Look for "Redis client initialized" (should appear quickly)
4. Redeploy if needed

### Issue: Tools List Returns Empty Array

**Cause**: Wrong response format or tools not registered

**Solution**:
1. Verify code has latest tools/list fix
2. Check that response returns `result.tools` array
3. Ensure tools are registered in MCP service
4. Redeploy if needed

---

## 📊 Complete MCPize Settings Summary

### General Settings
```
Name: mcp-shield
Description: Security, policy enforcement, and observability proxy
Runtime: TypeScript
Entry: src/main.ts
Build: npm run build
Start: node dist/main.js
```

### Connection Settings
```
Transport: streamable_http
Endpoint URL: https://mcp-shield.mcpize.run/mcp  ← CRITICAL!
Health Check: https://mcp-shield.mcpize.run/health
```

### Credentials
```
Type: api_key (recommended for testing)
       OR
Type: oauth2 (recommended for production)
```

### Secrets (Required)
```
✅ API_KEY_SALT = 5c254e5ac6023072d632689d334e3d4eb4a54fe4d9bb6e22b427a41985adc34f
✅ JWT_PUBLIC_KEY = (PEM block above)
✅ JWT_ISSUER = https://auth.mcpize.com
❌ DATABASE_URL = (auto-provided - DO NOT SET)
❌ REDIS_URL = (auto-provided - DO NOT SET)
❌ MCPIZE_WEBHOOK_SECRET = (appears after deploy)
```

### Secrets (Optional)
```
CORS_ORIGINS = https://*.mcpize.run,https://mcpize.com
ALLOWED_ORIGINS = mcp-shield.mcpize.run
SCAN_BLOCKLIST_DOMAINS = malware.com,phishing.org,scam-site.net
```

---

## 🎯 Quick Reference: What to Set in Dashboard

### ✅ DO SET These:

1. **Endpoint URL**: `https://mcp-shield.mcpize.run/mcp` (NOT `/`!)
2. **Transport**: `streamable_http`
3. **Credentials**: Configure API key or OAuth2
4. **Secrets**:
   - `API_KEY_SALT` = `5c254e5ac6023072d632689d334e3d4eb4a54fe4d9bb6e22b427a41985adc34f`
   - `JWT_PUBLIC_KEY` = (full PEM block)
   - `JWT_ISSUER` = `https://auth.mcpize.com`
   - `CORS_ORIGINS` = `https://*.mcpize.run,https://mcpize.com`
   - `ALLOWED_ORIGINS` = `mcp-shield.mcpize.run`
   - `SCAN_BLOCKLIST_DOMAINS` = `malware.com,phishing.org,scam-site.net`

### ❌ DO NOT SET These:

- `DATABASE_URL` (auto-provided)
- `REDIS_URL` (auto-provided)
- `MCPIZE_WEBHOOK_SECRET` (appears after deploy)

---

## 🚀 Final Deployment Checklist

- [ ] Code committed and pushed to GitHub
- [ ] Endpoint URL set to `/mcp` (NOT `/`)
- [ ] Transport set to `streamable_http`
- [ ] Credentials configured (API key or OAuth2)
- [ ] API_KEY_SALT added to secrets
- [ ] JWT_PUBLIC_KEY added to secrets
- [ ] JWT_ISSUER added to secrets
- [ ] CORS_ORIGINS added to secrets
- [ ] ALLOWED_ORIGINS added to secrets
- [ ] SCAN_BLOCKLIST_DOMAINS added to secrets
- [ ] Settings saved
- [ ] Server redeployed
- [ ] Health check returns 200 OK
- [ ] Initialize test succeeds
- [ ] Tools list test succeeds
- [ ] Discovery triggered
- [ ] 4 tools discovered

---

## 📝 Summary

### The Real Problem
MCPize was trying to discover at `https://mcp-shield.mcpize.run/` (root path) instead of `https://mcp-shield.mcpize.run/mcp` (MCP endpoint).

### The Fix
Change **Endpoint URL** in MCPize dashboard settings from:
```
❌ https://mcp-shield.mcpize.run/
```
To:
```
✅ https://mcp-shield.mcpize.run/mcp
```

### Result
After changing the endpoint URL and configuring secrets:
- ✅ Discovery will work (no more 404)
- ✅ Initialize will work (no more 500)
- ✅ Tools list will work (no more 401)
- ✅ All 4 tools will be discovered
- ✅ Server will be fully functional

---

**Status**: Dashboard configuration issue identified and solution provided! 🎯

Just change the Endpoint URL in MCPize dashboard and discovery will work!