#!/usr/bin/env node
/**
 * HubCycle MCP Server — Interactive setup script
 *
 * Usage: node mcp-server/setup.js
 *        npm run setup (from mcp-server/)
 *
 * What it does:
 *   1. Prompts for MCP API key
 *   2. Validates the key against the live API
 *   3. Writes ~/.hubcycle-mcp/config.json
 *   4. Updates ~/.claude/claude_desktop_config.json
 *   5. Updates ~/.claude/settings.json
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// ── Paths ─────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const HUBCYCLE_CONFIG_DIR = path.join(HOME, '.hubcycle-mcp');
const HUBCYCLE_CONFIG_FILE = path.join(HUBCYCLE_CONFIG_DIR, 'config.json');
const CLAUDE_CONFIG_DIR = path.join(HOME, '.claude');
const CLAUDE_DESKTOP_CONFIG = path.join(CLAUDE_CONFIG_DIR, 'claude_desktop_config.json');
const CLAUDE_CODE_SETTINGS = path.join(CLAUDE_CONFIG_DIR, 'settings.json');

const API_URL = 'https://hubcycle-dashboard.vercel.app';
const INDEX_JS_PATH = path.resolve(__dirname, 'index.js');

// ── Readline helpers ──────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

// ── HTTPS fetch helper (no external deps) ────────────────────────────────────

function httpsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 10s'));
    });

    req.on('error', reject);

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Validate key via /api/mcp-tools ──────────────────────────────────────────
//
// Strategy: POST to /api/mcp-tools with an empty body.
//   - Invalid key  → 401 { error: "Invalid API key" }
//   - Valid key    → 400 { error: "Missing \"tool\" field. Available tools: ..." }
// This tells us the key is real without triggering any write operation.

async function validateKey(apiKey) {
  const res = await httpsRequest(
    `${API_URL}/api/mcp-tools`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    },
    {},
  );

  if (res.status === 401) {
    return { valid: false, error: res.body?.error || 'Invalid API key' };
  }

  if (res.status === 403) {
    return { valid: false, error: res.body?.error || 'API key has been deactivated' };
  }

  // 400 means the key was accepted but the request body was incomplete — key is valid.
  // Any other 2xx/4xx/5xx with a non-401 status also means the key passed auth.
  if (res.status === 400 || res.status === 200) {
    // Try to extract user email from error message or body
    // The 400 body looks like: { error: "Missing \"tool\" field. Available tools: ..." }
    // We don't get user_email from this endpoint, so we'll derive it from the key prefix.
    return { valid: true, userEmail: null };
  }

  // Unexpected status — treat as network/server issue
  return { valid: false, error: `Unexpected response: HTTP ${res.status}` };
}

// ── JSON file helpers ─────────────────────────────────────────────────────────

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── MCP server entry for config files ────────────────────────────────────────

function mcpServerEntry() {
  return {
    command: 'node',
    args: [INDEX_JS_PATH],
  };
}

// ── Step 3: Save HubCycle config ──────────────────────────────────────────────

function saveHubcycleConfig(apiKey) {
  if (!fs.existsSync(HUBCYCLE_CONFIG_DIR)) {
    fs.mkdirSync(HUBCYCLE_CONFIG_DIR, { recursive: true });
  }
  writeJsonFile(HUBCYCLE_CONFIG_FILE, {
    api_key: apiKey,
    apiUrl: API_URL,
  });
}

// ── Step 4: Update Claude Desktop config ─────────────────────────────────────

function updateClaudeDesktopConfig() {
  const existing = readJsonFile(CLAUDE_DESKTOP_CONFIG) || {};
  const updated = {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers || {}),
      hubcycle: mcpServerEntry(),
    },
  };
  writeJsonFile(CLAUDE_DESKTOP_CONFIG, updated);
}

// ── Step 5: Update Claude Code settings ──────────────────────────────────────

function updateClaudeCodeSettings() {
  const existing = readJsonFile(CLAUDE_CODE_SETTINGS) || {};
  const updated = {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers || {}),
      hubcycle: mcpServerEntry(),
    },
  };
  writeJsonFile(CLAUDE_CODE_SETTINGS, updated);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nHubCycle MCP Server — Setup\n');
  console.log('This script will:');
  console.log('  • Validate your MCP API key');
  console.log('  • Save config to ~/.hubcycle-mcp/config.json');
  console.log('  • Register the MCP server in Claude Desktop & Claude Code\n');

  // 1. Prompt for API key
  const rawKey = (await ask('Enter your MCP API key (starts with mcp_): ')).trim();
  rl.close();

  // 2. Basic format validation
  if (!rawKey.startsWith('mcp_')) {
    console.error('\n✗ Invalid key format. The key must start with "mcp_".');
    process.exit(1);
  }

  // 3. Remote validation
  process.stdout.write('  Validating key...');
  let validationResult;
  try {
    validationResult = await validateKey(rawKey);
  } catch (err) {
    console.error(`\n✗ Network error during validation: ${err.message}`);
    console.error('  Check your internet connection and try again.');
    process.exit(1);
  }

  if (!validationResult.valid) {
    console.error(`\n✗ Key validation failed: ${validationResult.error}`);
    process.exit(1);
  }

  const displayEmail = validationResult.userEmail || 'key accepted';
  console.log(` OK\n✓ Key validated (${displayEmail})`);

  // 4. Save HubCycle config
  try {
    saveHubcycleConfig(rawKey);
    console.log('✓ Config saved to ~/.hubcycle-mcp/config.json');
  } catch (err) {
    console.error(`✗ Failed to save config: ${err.message}`);
    process.exit(1);
  }

  // 5. Update Claude Desktop config
  try {
    updateClaudeDesktopConfig();
    console.log('✓ Claude Desktop config updated');
  } catch (err) {
    console.error(`✗ Failed to update Claude Desktop config: ${err.message}`);
    // Non-fatal — continue
  }

  // 6. Update Claude Code settings
  try {
    updateClaudeCodeSettings();
    console.log('✓ Claude Code config updated');
  } catch (err) {
    console.error(`✗ Failed to update Claude Code settings: ${err.message}`);
    // Non-fatal — continue
  }

  // 7. Success summary
  console.log('\nRestart Claude to activate the HubCycle MCP tools.');
  console.log(
    'Available tools: create_partner, edit_partner, create_sales_opportunity,\n' +
    '                 edit_sales_opportunity, create_sourcing_opportunity,\n' +
    '                 edit_sourcing_opportunity, create_sale_order,\n' +
    '                 edit_product, update_stock_forecast\n',
  );
}

main().catch(err => {
  console.error('\nUnexpected error:', err.message);
  process.exit(1);
});
