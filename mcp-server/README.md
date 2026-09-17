# BizFlow MCP Server for Claude Desktop & ChatGPT

Connect **Claude Desktop**, **ChatGPT**, or **Cursor** directly to your **BizFlow Supabase Ledger** to perform financial entries, query live bank balances, search transactions, and bulk import statements using natural language!

---

## 🚀 Easy Setup (Remote MCP Server)

### Option 1: Claude Desktop (Recommended)
Open `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS and add:

```json
{
  "mcpServers": {
    "bizflow": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://bizflow.admagic.in/api/mcp"]
    }
  }
}
```

### Option 2: Cursor / Windsurf
Go to **Settings** > **Features** > **MCP** > **Add New MCP Server**:
- **Type:** `SSE`
- **URL:** `https://bizflow.admagic.in/api/mcp`

### Option 3: ChatGPT Custom GPT
Add an Action with the Base URL: `https://bizflow.admagic.in/api/mcp`

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
