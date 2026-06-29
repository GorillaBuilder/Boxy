import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import {
  supabase,
  getProfile, upsertProfile, deleteUser,
  listDesigns, getDesign, insertDesign, updateDesign, deleteDesign,
  listMessages, insertMessage,
  listKeys, insertKey, revokeKey,
  communityList, communityLike, communityRemix,
} from './db.js';
import {
  googleAuthUrl, exchangeCode, upsertUserManual, issueToken, authRequired, CLIENT,
} from './auth.js';
import { chatCompletion, LLM_MODEL } from './openrouter.js';
import { SYSTEM_PROMPT, PROCEED_HINT, CRITIQUE_HINT } from './prompt.js';
import { mountMcp, loadAddins, getManifest } from './mcp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { PORT = 8787 } = process.env;

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());
app.use(cors({ origin: CLIENT, credentials: true }));

// ─────────────────────── auth (old-school Google OAuth) ────────
app.get('/api/auth/google', (req, res) => res.redirect(googleAuthUrl()));

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const profile = await exchangeCode(req.query.code);
    const user = await upsertUserManual(profile);
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
    console.error('OAuth callback failed:', e);
    res.redirect('/login?error=auth');
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('boxy_session');
  res.json({ ok: true });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ user: req.user, model: LLM_MODEL });
});

// ─────────────────────── designs ───────────────────────────────
app.get('/api/designs', authRequired, async (req, res) => {
  try { res.json(await listDesigns(req.user.id)); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post('/api/designs', authRequired, async (req, res) => {
  try { res.json(await insertDesign(req.user.id, req.body.title || 'Untitled design')); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.get('/api/designs/:id', authRequired, async (req, res) => {
  try {
    const d = await getDesign(req.params.id, req.user.id);
    if (!d) return res.status(404).json({ error: 'not found' });
    res.json({ design: d, messages: await listMessages(d.id) });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.patch('/api/designs/:id', authRequired, async (req, res) => {
  try {
    const d = await getDesign(req.params.id, req.user.id);
    if (!d) return res.status(404).json({ error: 'not found' });
    const { title, dsl, thumbnail } = req.body;
    const patch = {};
    if (title != null) patch.title = title;
    if (dsl != null) patch.dsl = JSON.stringify(dsl);
    if (thumbnail != null) patch.thumbnail = thumbnail;
    await updateDesign(d.id, patch);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.delete('/api/designs/:id', authRequired, async (req, res) => {
  try { await deleteDesign(req.params.id, req.user.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// ─────────────────────── agent ─────────────────────────────────
app.post('/api/agent', authRequired, async (req, res) => {
  const { designId, history = [], userText, snapshot, bbox, proceed, critique } = req.body;
  const d = await getDesign(designId, req.user.id);
  if (!d) return res.status(404).json({ error: 'not found' });

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const m of history) {
    messages.push({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    });
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
    if (snapshot) {
      messages.push({ role: 'user', content: [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: snapshot } },
      ]});
    } else {
      messages.push({ role: 'user', content: userText });
    }
    await insertMessage(d.id, 'user', userText);
  }

  try {
    const raw = await chatCompletion({ messages });
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { parsed = { mode: 'plan', say: raw.slice(0, 280), plan: [] }; }
    await insertMessage(d.id, 'assistant', parsed);
    await updateDesign(d.id, {}); // bump updated_at
    res.json(parsed);
  } catch (e) {
    console.error('agent error', e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ─────────────────────── profile ───────────────────────────────
app.get('/api/profile', authRequired, async (req, res) => {
  try { res.json(await getProfile(req.user.id) || {}); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.patch('/api/profile', authRequired, async (req, res) => {
  try {
    const { bio, preferredModel } = req.body || {};
    const out = await upsertProfile(req.user.id, {
      ...(bio != null ? { bio } : {}),
      ...(preferredModel != null ? { preferred_model: preferredModel } : {}),
    });
    res.json(out);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.delete('/api/account', authRequired, async (req, res) => {
  try { await deleteUser(req.user.id); res.clearCookie('boxy_session'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// ─────────────────────── community ─────────────────────────────
app.get('/api/community', authRequired, async (req, res) => {
  try { res.json(await communityList()); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post('/api/community/:id/like', authRequired, async (req, res) => {
  try { await communityLike(req.user.id, req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post('/api/community/:id/remix', authRequired, async (req, res) => {
  try {
    const designId = await communityRemix(req.user.id, req.params.id);
    res.json({ designId });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post('/api/community/publish', authRequired, async (req, res) => {
  const { designId, description, tags } = req.body || {};
  const d = await getDesign(designId, req.user.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  const { data, error } = await supabase.from('community_posts').insert({
    user_id: req.user.id, design_id: designId,
    title: d.title, description: description || null, thumbnail: d.thumbnail || null,
    tags: tags || [],
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─────────────────────── api keys (MCP) ────────────────────────
app.post('/api/keys', authRequired, async (req, res) => {
  const key = 'bxy_' + nanoid(36);
  await insertKey(req.user.id, key);
  res.json({ key });
});
app.get('/api/keys', authRequired, async (req, res) => {
  try { res.json(await listKeys(req.user.id)); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
app.delete('/api/keys/:prefix', authRequired, async (req, res) => {
  const ok = await revokeKey(req.user.id, req.params.prefix);
  res.json({ ok });
});

// ─────────────────────── addins ────────────────────────────────
app.get('/api/addins/manifest', authRequired, (req, res) => res.json(getManifest()));
app.use('/addins', express.static(join(__dirname, '..', 'addins')));
app.post('/api/addins/call', authRequired, async (req, res) => {
  const { name, args } = req.body || {};
  const { getTool } = await import('./mcp.js');
  const tool = getTool(name);
  if (!tool) return res.status(404).json({ error: 'unknown tool' });
  try { res.json(await tool.run({ userId: req.user.id, params: args || {} })); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// ─────────────────────── MCP JSON-RPC ──────────────────────────
mountMcp(app);

// ─────────────────────── boot ──────────────────────────────────
await loadAddins();
app.listen(PORT, () => console.log(
  `Boxy server on http://localhost:${PORT}\n` +
  `  auth:    Google OAuth (manual) → Supabase\n` +
  `  storage: Supabase (${process.env.SUPABASE_URL || 'unset'})\n` +
  `  model:   ${LLM_MODEL}\n` +
  `  MCP:     POST /mcp/v1/rpc\n` +
  `  tools:   ${getManifest().tools.length} (incl ${getManifest().addins.length} addin${getManifest().addins.length===1?'':'s'})`
));