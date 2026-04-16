/**
 * API client for the HubCycle Vercel deployment.
 *
 * Reads the MCP token from ~/.hubcycle-mcp/config.json and sends
 * tool calls to POST /api/mcp-tools.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.hubcycle-mcp', 'config.json');

// Default to production URL, overridable via env
const BASE_URL = process.env.HUBCYCLE_API_URL || 'https://hubcycle-dashboard.vercel.app';

let cachedConfig = null;

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    cachedConfig = JSON.parse(raw);
    return cachedConfig;
  } catch (err) {
    throw new Error(
      `Failed to read MCP config from ${CONFIG_PATH}. Run 'node setup.js' first.\n${err.message}`
    );
  }
}

/**
 * Call a write tool on the HubCycle API.
 *
 * @param {string} toolName - Tool name (e.g. 'create_partner')
 * @param {object} args - Tool arguments
 * @returns {Promise<object>} API response JSON
 */
export async function callTool(toolName, args) {
  const config = loadConfig();
  const token = config.api_key;
  if (!token) {
    throw new Error('No api_key found in config. Run setup.js again.');
  }

  const url = `${BASE_URL}/api/mcp-tools`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tool: toolName,
      arguments: args,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const errorMsg = body.error || body.details || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  return body;
}

/**
 * Proxy a read query to /api/mcp-proxy (SQL passthrough).
 *
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} API response JSON
 */
export async function proxyQuery(sql, params = []) {
  const config = loadConfig();
  const token = config.api_key;
  if (!token) {
    throw new Error('No api_key found in config. Run setup.js again.');
  }

  const url = `${BASE_URL}/api/mcp-proxy`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sql, params }),
  });

  const body = await response.json();

  if (!response.ok) {
    const errorMsg = body.error || body.details || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  return body;
}
