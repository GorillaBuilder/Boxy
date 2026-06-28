import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import store from './db.js';
import {
  googleAuthUrl, exchangeCode, upsertUser, issueToken, authRequired, CLIENT,
} from './auth.js';
import { chatCompletion, LLM_MODEL } from './openrouter.js';
import { SYSTEM_PROMPT, PROCEED_HINT, CRITIQUE_HINT } from './prompt.js';
import { mountMcp, loadAddins, getManifest, createApiKey, listApiKeysForUser, revokeApiKey } from './mcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());
app.use(cors({ origin: CLIENT, credentials: true }));

const PORT = process.env.PORT || 8787;

/* ---------------- auth ---------------- */
app.get('/api/auth/google', (req, res) => res.redirect(googleAuthUrl()));

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const profile = await exchangeCode(req.query.code);
    const user = upsertUser(profile);
    const token = issueToken(user);
    const crossSite = process.env.CROSS_SITE_COOKIES === 'true';
    res.cookie('boxy_session', token, {
      httpOnly: true,
      sameSite: crossSite ? 'none' : 'lax',
      secure: crossSite,
      maxAge: 30 * 864e5,
    });
    res.redirect('/auth/callback');
  } catch (e) {
    console.error(e);
    res.redirect('/login?error=auth');
  }
});

app.post('/api/auth/logout', (req, res) => { res.clearCookie('boxy_session'); res.json({ ok: true }); });
app.get('/api/me', authRequired, (req, res) => res.json({ user: req.user, model: LLM_MODEL }));

/* ---------------- designs ---------------- */
app.get('/api/designs', authRequired, (req, res) => res.json(store.listDesigns(req.user.id)));
app.post('/api/designs', authRequired, (req, res) =>
  res.json(store.insertDesign(req.user.id, req.body.title || 'Untitled design')));

app.get('/api/designs/:id', authRequired, (req, res) => {
  const d = store.getDesign(req.params.id, req.user.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  res.json({ design: { ...d, updated_at: d.updatedAt }, messages: store.listMessages(d.id) });
});

app.patch('/api/designs/:id', authRequired, (req, res) => {
  const d = store.getDesign(req.params.id, req.user.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  const { title, dsl, thumbnail } = req.body;
  const patch = {};
  if (title != null) patch.title = title;
  if (dsl != null) patch.dsl = JSON.stringify(dsl);
  if (thumbnail != null) patch.thumbnail = thumbnail;
  store.updateDesign(d.id, patch);
  res.json({ ok: true });
});

app.delete('/api/designs/:id', authRequired, (req, res) => {
  store.deleteDesign(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ---------------- agent ---------------- */
app.post('/api/agent', authRequired, async (req, res) => {
  const { designId, history = [], userText, snapshot, bbox, proceed, critique } = req.body;
  const d = store.getDesign(designId, req.user.id);
  if (!d) return res.status(404).json({ error: 'not found' });

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const m of history) {
    messages.push({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) });
  }

  if (critique) {
    const content = [{ type: 'text', text: `${CRITIQUE_HINT}\nBounding box: ${JSON.stringify(bbox || {})}` }];
    if (snapshot) content.push({ type: 'image_url', image_url: { url: snapshot } });
    messages.push({ role: 'user', content });
  } else if (proceed) {
    const content = [{ type: 'text', text: `${PROCEED_HINT}\nBounding box: ${JSON.stringify(bbox || {})}` }];
    if (snapshot) content.push({ type: 'image_url', image_url: { url: snapshot } });
    messages.push({ role: 'user', content });
  } else if (userText) {
    // user-initiated message: if a snapshot was attached, send it alongside the text
    // as a multimodal content array so the model can SEE the current canvas.
    if (snapshot) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: snapshot } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userText });
    }
    store.insertMessage(d.id, 'user', userText);
  }

  try {
    const raw = await chatCompletion({ messages });
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { parsed = { mode: 'plan', say: raw.slice(0, 280), plan: [] }; }
    store.insertMessage(d.id, 'assistant', parsed);
    store.updateDesign(d.id, {});
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* ---------------- MCP keys (UI-facing) ---------------- */
app.post('/api/keys', authRequired, (req, res) => res.json({ key: createApiKey(req.user.id) }));
app.get('/api/keys', authRequired, (req, res) =>
  res.json(listApiKeysForUser(req.user.id).map(k => ({
    key: k.key.slice(0, 12) + '…',
    createdAt: k.createdAt,
  }))));
app.delete('/api/keys/:key', authRequired, (req, res) => {
  const ok = revokeApiKey(req.user.id, req.params.key);
  res.json({ ok });
});

/* ---------------- addins ---------------- */
app.get('/api/addins/manifest', authRequired, (req, res) => res.json(getManifest()));
app.use('/addins', express.static(join(__dirname, '..', 'addins')));
app.post('/api/addins/call', authRequired, async (req, res) => {
  const { name, args } = req.body || {};
  const { getTool } = await import('./mcp.js');
  const tool = getTool(name);
  if (!tool) return res.status(404).json({ error: 'unknown tool' });
  try {
    const result = await tool.run({ userId: req.user.id, params: args || {} });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/* ---------------- MCP server (JSON-RPC + SSE) ---------------- */
mountMcp(app);

/* ---------------- boot ---------------- */
await loadAddins();
app.listen(PORT, () => console.log(
  `Boxy server on http://localhost:${PORT}\n` +
  `  model: ${LLM_MODEL}\n` +
  `  MCP:   POST /mcp/v1/rpc   (x-boxy-key required)\n` +
  `  tools: ${getManifest().tools.length}  (incl ${getManifest().addins.length} addin${getManifest().addins.length===1?'':'s'})`
));