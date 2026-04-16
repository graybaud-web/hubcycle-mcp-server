# HubCycle MCP Server

Write tools for the HubCycle Dashboard — create and edit partners, opportunities, sale orders, products, and stock forecasts directly from Claude Code or Claude Desktop.

## Setup (2 minutes)

### 1. Clone this repo

```bash
cd ~/projects
git clone https://github.com/graybaud-web/hubcycle-mcp-server.git
cd hubcycle-mcp-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the setup wizard

```bash
node setup.js
```

When prompted, paste your MCP API key (starts with `mcp_`). Ask Georges for your key if you don't have one.

The setup wizard will:
- Validate your key against the live API
- Save config to `~/.hubcycle-mcp/config.json`
- Register the MCP server in Claude Desktop and Claude Code

### 4. Restart Claude

Restart Claude Code (or Claude Desktop) for the tools to appear. Alternatively, in Claude Code you can run `/reload-plugins`.

### 5. Test

Ask Claude something like:

> "Create a new prospect called 'Test Corp US' with email test@testcorp.com, country US"

Claude should see the `create_partner` tool and call it.

## Available tools

| Tool | Description |
|------|-------------|
| `create_partner` | Create a new partner (customer, supplier, or prospect) |
| `edit_partner` | Edit an existing partner's fields |
| `create_sales_opportunity` | Create a new sales opportunity |
| `edit_sales_opportunity` | Edit an existing sales opportunity |
| `create_sourcing_opportunity` | Create a new sourcing opportunity |
| `edit_sourcing_opportunity` | Edit an existing sourcing opportunity |
| `create_sale_order` | Create a new sale order |
| `edit_product` | Edit product template fields |
| `update_stock_forecast` | Update stock forecast entries |

## Verify in Supabase

```sql
SELECT * FROM partners WHERE name = 'Test Corp US';
SELECT * FROM mcp_query_log WHERE query_type LIKE 'tool:%' ORDER BY created_at DESC LIMIT 5;
```

## Troubleshooting

- **"Cannot find module"**: Run `npm install` first
- **"Invalid API key"**: Check your key starts with `mcp_` and hasn't been revoked
- **Tools don't appear in Claude**: Restart Claude Code or run `/reload-plugins`
- **Node version errors**: Requires Node.js 18+
