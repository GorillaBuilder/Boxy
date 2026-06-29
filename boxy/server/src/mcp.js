// MCP (Model Context Protocol) server. JSON-RPC 2.0 over HTTP + SSE.
// Authenticated by API key in the x-boxy-key header.

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdir, stat } from 'fs/promises';
import {
  supabase,
  findKey, bumpKey,
  listDesigns, getDesign, insertDesign, updateDesign,
  listMessages, insertMessage,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────── tool registry ───────────────────────
const tools = new Map(); // name → { description, input, run }
const addins = [];       // [{ id, name, description, version, panel }]

export function registerTool(t) { tools.set(t.name, t); }
export function getTool(name) { return tools.get(name); }
export function getManifest() {
  return {
    tools: Array.from(tools.entries()).map(([name, t]) => ({
      name, description: t.description, input: t.input,
    })),
    addins,
  };
}

// ─────────────────────── core tools ──────────────────────────
registerTool({
  name: 'design.list',
  description: 'List designs owned by the authenticated user.',
  input: { type: 'object', properties: {} },
  run: async ({ userId }) => await listDesigns(userId),
});
registerTool({
  name: 'design.get',
  description: 'Get a design (with ops + messages).',
  input: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  run: async ({ userId, params }) => {
    const d = await getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    return { design: d, messages: await listMessages(d.id) };
  },
});
registerTool({
  name: 'design.create',
  description: 'Create a new design.',
  input: { type: 'object', properties: { title: { type: 'string' } } },
  run: async ({ userId, params }) =>
    await insertDesign(userId, params?.title || 'Untitled design'),
});
registerTool({
  name: 'design.append_ops',
  description: 'Append BoxyDSL ops to a design.',
  input: {
    type: 'object',
    properties: { id: { type: 'string' }, ops: { type: 'array' } },
    required: ['id', 'ops'],
  },
  run: async ({ userId, params }) => {
    const d = await getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    const current = JSON.parse(d.dsl || '[]');
    const next = current.concat(params.ops || []);
    await updateDesign(d.id, { dsl: JSON.stringify(next) });
    return { count: next.length };
  },
});
registerTool({
  name: 'design.replace_ops',
  description: 'Replace a design\'s ops wholesale.',
  input: {
    type: 'object',
    properties: { id: { type: 'string' }, ops: { type: 'array' } },
    required: ['id', 'ops'],
  },
  run: async ({ userId, params }) => {
    const d = await getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    await updateDesign(d.id, { dsl: JSON.stringify(params.ops || []) });
    return { count: (params.ops || []).length };
  },
});
registerTool({
  name: 'design.snapshot',
  description: 'Get the last persisted thumbnail of a design (data URL).',
  input: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  run: async ({ userId, params }) => {
    const d = await getDesign(params.id, userId);
    if (!d) throw new Error('not found');
    return { thumbnail: d.thumbnail || null };
  },
});

// ─────────────────────── addin loader ────────────────────────
export async function loadAddins() {
  const addinsDir = join(__dirname, '..', 'addins');
  let entries;
  try { entries = await readdir(addinsDir); } catch { return; }
  for (const id of entries) {
    const full = join(addinsDir, id);
    let s; try { s = await stat(full); } catch { continue; }
    if (!s.isDirectory()) continue;
    const indexPath = join(full, 'index.js');
    try {
      const mod = await import(`file://${indexPath}`);
      const addin = mod.default;
      if (!addin || !addin.id) continue;
      addins.push({
        id: addin.id, name: addin.name || addin.id,
        description: addin.description || '',
        version: addin.version, panel: addin.panel,
      });
      for (const t of addin.tools || []) {
        registerTool({
          name: `${addin.id}.${t.name}`,
          description: t.description, input: t.input,
          run: t.run,
        });
      }
      console.log(`  · loaded addin ${addin.id} (${(addin.tools || []).length} tools)`);
    } catch (e) {
      console.warn(`  · failed to load addin ${id}:`, e.message);
    }
  }
}

// ─────────────────────── HTTP / RPC ──────────────────────────
// SSE connections keyed by user id, for live updates back to MCP clients.
const sseClients = new Map(); // userId → Set<res>

export function broadcast(userId, event, data) {
  const set = sseClients.get(userId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) { try { res.write(payload); } catch {} }
}

async function authByKey(req, res) {
  const key = req.headers['x-boxy-key'];
  if (!key) { res.status(401).json({ error: 'missing x-boxy-key' }); return null; }
  const row = await findKey(key);
  if (!row) { res.status(401).json({ error: 'invalid key' }); return null; }
  bumpKey(key).catch(() => {});
  return row.user_id;
}

export function mountMcp(app) {
  app.get('/mcp/v1/manifest', async (req, res) => {
    const userId = await authByKey(req, res); if (!userId) return;
    res.json(getManifest());
  });

  app.post('/mcp/v1/rpc', async (req, res) => {
    const userId = await authByKey(req, res); if (!userId) return;
    const { id, method, params } = req.body || {};
    const reply = (result) => res.json({ jsonrpc: '2.0', id, result });
    const fail  = (code, message) => res.json({ jsonrpc: '2.0', id, error: { code, message } });

    try {
      if (method === 'tools/list') return reply(getManifest());
      if (method === 'tools/call') {
        const tool = tools.get(params?.name);
        if (!tool) return fail(-32601, `unknown tool: ${params?.name}`);
        const result = await tool.run({ userId, params: params?.arguments || {} });
        return reply(result);
      }
      return fail(-32601, `unknown method: ${method}`);
    } catch (e) {
      return fail(-32000, e.message || String(e));
    }
  });

  app.get('/mcp/v1/sse', async (req, res) => {
    const userId = await authByKey(req, res); if (!userId) return;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`event: hello\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
    const set = sseClients.get(userId) || new Set();
    set.add(res); sseClients.set(userId, set);
    req.on('close', () => { set.delete(res); });
  });
}