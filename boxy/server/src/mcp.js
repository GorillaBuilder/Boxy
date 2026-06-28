// Minimal MCP-style server: JSON-RPC over HTTP for tools that operate on a Boxy design.
// Lets external agents (Claude Desktop, custom MCP clients) drive Boxy.
//
// Endpoints:
//   POST  /mcp/v1/rpc        { jsonrpc, id, method, params }   (single call)
//   GET   /mcp/v1/sse        server-sent events for live updates
//   GET   /mcp/v1/manifest   list of tools (built-in + addin-registered)
//
// Auth: API key in header `x-boxy-key` mapped 1:1 to a user. Generated per-user from the UI.

import { nanoid } from 'nanoid';
import { store } from './db.js';

const subscribers = new Map(); // designId -> Set<res>
const apiKeys = new Map();     // key -> userId  (in-memory; persisted to store on first set)

// Hydrate api keys from store at boot
function loadKeys() {
  const all = store.listApiKeys?.() || [];
  for (const k of all) apiKeys.set(k.key, k.userId);
}
loadKeys();

/* ----- tool registry (built-in + addin-registered) ----- */
const tools = new Map();

function registerTool(spec) {
  tools.set(spec.name, spec);
}

// Built-in tools — these are the surface external agents see.
registerTool({
  name: 'design.list',
  description: 'List all of the user\'s designs.',
  input: { type: 'object', properties: {} },
  run: async ({ userId }) => store.listDesigns(userId),
});
registerTool({
  name: 'design.get',
  description: 'Get a design and its current DSL program + messages.',
  input: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  run: async ({ userId, params }) => {
    const d = store.getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    return { design: d, messages: store.listMessages(d.id) };
  },
});
registerTool({
  name: 'design.create',
  description: 'Create a new design.',
  input: { type: 'object', properties: { title: { type: 'string' } } },
  run: async ({ userId, params }) => store.insertDesign(userId, params.title || 'Untitled'),
});
registerTool({
  name: 'design.append_ops',
  description: 'Append BoxyDSL ops to a design. The canvas updates live.',
  input: { type: 'object', required: ['id', 'ops'], properties: {
    id: { type: 'string' }, ops: { type: 'array' },
  } },
  run: async ({ userId, params }) => {
    const d = store.getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    const current = JSON.parse(d.dsl || '[]');
    const next = [...current, ...params.ops];
    store.updateDesign(d.id, { dsl: JSON.stringify(next) });
    broadcast(d.id, { type: 'ops_appended', ops: params.ops });
    return { count: next.length };
  },
});
registerTool({
  name: 'design.replace_ops',
  description: 'Replace the entire BoxyDSL program for a design.',
  input: { type: 'object', required: ['id', 'ops'], properties: {
    id: { type: 'string' }, ops: { type: 'array' },
  } },
  run: async ({ userId, params }) => {
    const d = store.getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    store.updateDesign(d.id, { dsl: JSON.stringify(params.ops) });
    broadcast(d.id, { type: 'ops_replaced', ops: params.ops });
    return { count: params.ops.length };
  },
});
registerTool({
  name: 'design.snapshot',
  description: 'Get the last rendered thumbnail (data URL) for the design.',
  input: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  run: async ({ userId, params }) => {
    const d = store.getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    return { thumbnail: d.thumbnail || null };
  },
});

/* ----- addin loader -----
 * Addins are JS modules dropped into server/addins/<name>/index.js that export:
 *   export default {
 *     id: 'my-addin',
 *     name: 'My Addin',
 *     panel?: { url: '/addins/my-addin/panel.html' },   // optional UI panel
 *     tools: [ { name, description, input, run } ]
 *   }
 * They're loaded at boot. UI panel manifest is exposed to the client.
 */
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADDINS_DIR = join(__dirname, '..', 'addins');

const addins = [];

export async function loadAddins() {
  if (!existsSync(ADDINS_DIR)) return;
  const dirs = readdirSync(ADDINS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const dir of dirs) {
    const entry = join(ADDINS_DIR, dir.name, 'index.js');
    if (!existsSync(entry)) continue;
    try {
      const mod = await import(pathToFileURL(entry).href);
      const addin = mod.default;
      if (!addin?.id) continue;
      addins.push(addin);
      for (const tool of addin.tools || []) {
        registerTool({ ...tool, name: `${addin.id}.${tool.name}`, addin: addin.id });
      }
      console.log(`[addin] loaded ${addin.id} (${addin.tools?.length || 0} tools)`);
    } catch (e) {
      console.error(`[addin] failed to load ${dir.name}:`, e.message);
    }
  }
}

export function getAddins() { return addins; }
export function getTool(name) { return tools.get(name); }
export function getManifest() {
  return {
    tools: Array.from(tools.values()).map(({ name, description, input, addin }) => ({
      name, description, input, addin: addin || 'core',
    })),
    addins: addins.map(a => ({ id: a.id, name: a.name, panel: a.panel || null })),
  };
}

/* ----- SSE broadcast (for live canvas updates from external agents) ----- */
function broadcast(designId, payload) {
  const subs = subscribers.get(designId);
  if (!subs) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of subs) try { res.write(line); } catch {}
}

/* ----- key management (called from auth-protected /api routes) ----- */
export function createApiKey(userId) {
  const key = 'bxy_' + nanoid(28);
  apiKeys.set(key, userId);
  store.insertApiKey?.({ key, userId });
  return key;
}
export function listApiKeysForUser(userId) {
  return (store.listApiKeys?.() || []).filter(k => k.userId === userId);
}
export function revokeApiKey(userId, key) {
  if (apiKeys.get(key) !== userId) return false;
  apiKeys.delete(key);
  store.deleteApiKey?.(key);
  return true;
}

/* ----- express wiring ----- */
export function mountMcp(app) {
  app.get('/mcp/v1/manifest', (req, res) => res.json(getManifest()));

  app.post('/mcp/v1/rpc', async (req, res) => {
    const key = req.header('x-boxy-key');
    const userId = apiKeys.get(key);
    if (!userId) return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'invalid api key' } });

    const { jsonrpc, id, method, params } = req.body || {};
    if (jsonrpc !== '2.0' || !method) return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'invalid request' } });

    if (method === 'tools/list') return res.json({ jsonrpc: '2.0', id, result: getManifest().tools });
    if (method === 'tools/call') {
      const tool = tools.get(params?.name);
      if (!tool) return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'unknown tool' } });
      try {
        const result = await tool.run({ userId, params: params?.arguments || {} });
        return res.json({ jsonrpc: '2.0', id, result });
      } catch (e) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: String(e.message || e) } });
      }
    }
    return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'unknown method' } });
  });

  app.get('/mcp/v1/sse', (req, res) => {
    const key = req.query.key;
    const designId = req.query.designId;
    const userId = apiKeys.get(key);
    if (!userId || !designId) return res.status(401).end();
    const d = store.getDesign(designId, userId);
    if (!d) return res.status(404).end();
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders?.();
    if (!subscribers.has(designId)) subscribers.set(designId, new Set());
    subscribers.get(designId).add(res);
    res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);
    req.on('close', () => subscribers.get(designId)?.delete(res));
  });
}
