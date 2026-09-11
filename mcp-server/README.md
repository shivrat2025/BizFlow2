# BizFlow MCP Server for Claude Desktop

Connect **Claude Desktop** (or Cursor / Antigravity) directly to your **BizFlow Neon PostgreSQL Database** to perform financial entries, query balances, search transactions, and bulk import statements using natural language!

---

## 🚀 How to Setup in Claude Desktop

### Step 1: Open Claude Desktop Configuration File
- **macOS Path:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Step 2: Add `bizflow` MCP Server
Add the following JSON block to `mcpServers` inside `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bizflow": {
      "command": "node",
      "args": [
        "/Users/shivangkoshia/Documents/Apps/BizFlow-main/mcp-server/index.mjs"
      ],
      "env": {
        "NEON_DATABASE_URL": "postgresql://neondb_owner:npg_MQYpxwa17zRV@ep-jolly-grass-b3c2d7vr-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
        "BIZFLOW_WORKSPACE_ID": "SHIVRAT"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop App
Close and re-open Claude Desktop. You will see the **🔨 Hammer icon (MCP Tools)** active with **BizFlow Tools**:
- `add_transaction`
- `get_account_balances`
- `search_transactions`
- `get_financial_summary`
- `bulk_add_transactions`

---

## 💬 Prompts You Can Try in Claude:

1. *"Add an expense of ₹15,000 for FB Ads on 29 August from IDFC Bank"*
2. *"What are my current bank account balances?"*
3. *"Show me all profit withdrawals recorded this month"*
4. *"Here is my PDF statement text, please extract all expenses and bulk add them to BizFlow"*
