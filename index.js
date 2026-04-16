#!/usr/bin/env node

/**
 * HubCycle MCP Server — stdio transport.
 *
 * Registers all 9 write tools plus a read query tool with the MCP protocol,
 * then proxies each tool call to the Vercel API via api-client.js.
 *
 * Usage:
 *   node index.js          (stdio mode — launched by Claude Desktop/Code)
 *   HUBCYCLE_API_URL=...   (override API base URL for dev)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './lib/tools.js';
import { callTool, proxyQuery } from './lib/api-client.js';

const server = new Server(
  { name: 'hubcycle', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Query tool definition (read passthrough) ─────────────────────────────

const QUERY_TOOL = {
  name: 'query',
  description: 'Run a read-only SQL query against the HubCycle database (Supabase). Returns rows as JSON.',
  inputSchema: {
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'SQL SELECT query to execute' },
      params: {
        type: 'array',
        description: 'Query parameters (for parameterized queries)',
        items: {},
        default: [],
      },
    },
    required: ['sql'],
  },
};

// ── List tools ───────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [...TOOLS, QUERY_TOOL] };
});

// ── Call tool ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'query') {
      const result = await proxyQuery(args.sql, args.params || []);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data || result, null, 2),
          },
        ],
      };
    }

    const result = await callTool(name, args || {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data || result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ── Start ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
