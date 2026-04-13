# MCPize Debugging Guide - Discovery Still Failing

## Status
- ✅ Deployment: Successful
- ❌ Discovery: Failed

## Step-by-Step Diagnosis

### Step 1: Verify Endpoint URL Setting

**Most Likely Issue**: Endpoint URL in dashboard is still set to `/` instead of `/mcp`

1. Go to: https://mcpize.com/developer/servers/mcp-shield/settings
2. Look for **"Endpoint URL"** field
3. **CRITICAL**: What does it currently show?
   - Is it: `https://mcp-shield.mcpize.run/` ❌
   - Or: `https://mcp-shield.mcpize.run/mcp` ✅

**If it's `/`**:
1. Change it to `/mcp`
2. Click **Save**
3. Click **Redeploy**
4. Wait for deployment
5. Click **Retry Discovery**

### Step 2: Check if Code is Deployed

1. Go to: https://mcpize.com/developer/servers/mcp-shield
2. Click **"Build Logs"** or **"Deploy Logs"**
3. Look for these messages:
   ```
   ✅ "RouterExplorer] Mapped {/mcp, POST} route"
   ✅ "RouterExplorer] Mapped {/health, GET} route"
   ✅ "Redis client initialized"
   ✅ "Nest application successfully started"
   ```

**If you DON'T see these**:
- The latest code isn't deployed yet
- You need to push latest commits and redeploy

### Step 3: Test MCP Endpoint Directly

Run these tests to see what's happening:

```bash
# Test 1: Does /mcp endpoint exist?
curl -v https://mcp-shield.mcpize.run/mcp

# Should return 405 Method Not Allowed (exists but needs POST)
# If it returns 404, the endpoint doesn't exist

# Test 2: Initialize request
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }' \
  https://mcp-shield.mcpize.run/mcp

# Should return 200 with server info
# If it returns 404, endpoint doesn't exist
# If it returns 500, there's a server error

# Test 3: Does / (root) return 404?
curl -v https://mcp-shield.mcpize.run/

# Should return 404 (correct - no endpoint at root)
```

**Share the results of these tests!**

### Step 4: Check Secrets Configuration

1. Go to: https://mcpize.com/developer/servers/mcp-shield/settings
2. Scroll to **"Secrets"** section
3. Verify these are set:
   - ✅ API_KEY_SALT
   - ✅ JWT_PUBLIC_KEY
   - ✅ JWT_ISSUER
4. Click **"Diagnose with AI"** button
5. **Copy and share the AI diagnosis**

### Step 5: Check Transport Settings

1. Go to: https://mcpize.com/developer/servers/mcp-shield/settings
2. Look for **"Transport"** field
3. Verify it's set to: `streamable_http`
4. If it's set to something else (like `stdio` or `sse`), change it

### Step 6: Review mcpize.yaml Configuration

Check if mcpize.yaml has the correct configuration:

```yaml
version: 1
name: mcp-shield
runtime: typescript
entry: src/main.ts
build:
  install: npm ci
  command: npm run build
startCommand:
  type: http
  command: node dist/main.js
```

**Does your mcpize.yaml match this exactly?**

## Most Common Issues & Solutions

### Issue 1: Endpoint URL Not Changed

**Symptom**: Discovery fails with 404
**Cause**: Endpoint URL is still `/` instead of `/mcp`

**Solution**:
1. Go to MCPize dashboard settings
2. Change Endpoint URL to `/mcp`
3. Save and redeploy

### Issue 2: Old Code Deployed

**Symptom**: Build logs don't show `/mcp` route
**Cause**: Latest fixes not deployed yet

**Solution**:
```bash
# Check if latest code is pushed
git log --oneline -5

# If you don't see the latest commits, push them:
git push

# Then redeploy via dashboard or CLI
mcpize deploy
```

### Issue 3: Secrets Not Set

**Symptom**: Discovery fails with 500 or 503
**Cause**: Required secrets not configured

**Solution**:
1. Go to MCPize dashboard settings
2. Add all required secrets
3. Save and redeploy

### Issue 4: Wrong Transport Type

**Symptom**: Discovery fails with connection error
**Cause**: Transport set to `stdio` instead of `streamable_http`

**Solution**:
1. Go to MCPize dashboard settings
2. Change Transport to `streamable_http`
3. Save and redeploy

## Next Steps - Please Provide This Information

To help diagnose further, please share:

### 1. Current Endpoint URL Setting
```
What does your MCPize dashboard show for Endpoint URL?
- https://mcp-shield.mcpize.run/ (root)
- https://mcp-shield.mcpize.run/mcp (mcp endpoint)
```

### 2. Test Results
```bash
# Run these and share the output:

curl https://mcp-shield.mcpize.run/mcp

curl -X POST https://mcp-shield.mcpize.run/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

### 3. Build Logs
```
Copy the last 20-30 lines from Build Logs in MCPize dashboard
Look for: "Mapped {/mcp, POST}"
```

### 4. AI Diagnosis
```
Click "Diagnose with AI" in MCPize dashboard
Copy and paste the full diagnosis here
```

### 5. Recent Git Commits
```bash
git log --oneline -10
```

## Quick Fixes to Try

### Fix 1: Force Redeploy
```bash
# Ensure latest code is pushed
git push origin main

# Force redeploy via MCPize CLI
mcpize deploy --force
```

### Fix 2: Verify Endpoint URL
1. Go to MCPize dashboard
2. Clear the Endpoint URL field
3. Paste: `https://mcp-shield.mcpize.run/mcp`
4. Save (don't click redeploy yet)
5. Wait 10 seconds
6. Click Redeploy
7. Wait for deployment
8. Click Retry Discovery

### Fix 3: Reconfigure All Settings

1. Go to MCPize dashboard settings
2. Clear all secret fields
3. Re-enter them one by one
4. Save
5. Redeploy
6. Retry Discovery

## Expected Behavior

When everything is correct, you should see:

### Dashboard:
```
✅ Deployment: Successful
✅ Discovery: Success
✅ Tools: 4 discovered
   - proxy.call
   - logs.get
   - policy.set
   - security.scan
```

### Server Logs:
```
[Nest] [RouterExplorer] Mapped {/mcp, POST} route
[Nest] [RedisService] Redis client initialized
[Nest] [NestApplication] Nest application successfully started
```

### Discovery Test:
```bash
curl -X POST https://mcp-shield.mcpize.run/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# Returns:
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

---

**Please provide the information requested above so I can help diagnose further!**