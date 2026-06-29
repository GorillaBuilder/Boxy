// Thin wrapper around Supabase. Keeps the call-sites in index.js tidy.
// Uses the SERVICE ROLE key so the server can read/write any user's data.
// Client-side code goes through /api with our session cookie (Supabase JWT).

import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[boxy] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — DB calls will fail.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─────────────────────── USERS ───────────────────────
export async function upsertUserFromAuth(authUser) {
  // authUser is what Supabase Auth gives us (id, email, user_metadata.{name,picture}).
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email,
      avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
    }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUser(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteUser(userId) {
  // Cascade deletes via FK constraints in schema. Wipe auth user too.
  await supabase.from('designs').delete().eq('user_id', userId);
  await supabase.from('api_keys').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('user_id', userId);
  await supabase.from('users').delete().eq('id', userId);
  try { await supabase.auth.admin.deleteUser(userId); } catch (e) { console.warn('auth deleteUser failed', e); }
}

// ─────────────────────── DESIGNS ─────────────────────
export async function listDesigns(userId) {
  const { data, error } = await supabase
    .from('designs').select('id,title,thumbnail,dsl,updated_at')
    .eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(d => ({ ...d, updatedAt: new Date(d.updated_at).getTime() }));
}
export async function getDesign(id, userId) {
  const { data, error } = await supabase
    .from('designs').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { ...data, updatedAt: new Date(data.updated_at).getTime() } : null;
}
export async function insertDesign(userId, title) {
  const { data, error } = await supabase
    .from('designs').insert({ user_id: userId, title, dsl: '[]' }).select().single();
  if (error) throw error;
  return data;
}
export async function updateDesign(id, patch) {
  const next = { ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('designs').update(next).eq('id', id);
  if (error) throw error;
}
export async function deleteDesign(id, userId) {
  const { error } = await supabase.from('designs').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ─────────────────────── MESSAGES ────────────────────
export async function listMessages(designId) {
  const { data, error } = await supabase
    .from('messages').select('*').eq('design_id', designId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(m => ({ ...m, content: m.content }));
}
export async function insertMessage(designId, role, content) {
  const payload = typeof content === 'string' ? { text: content } : content;
  const { error } = await supabase
    .from('messages').insert({ design_id: designId, role, content: payload });
  if (error) throw error;
}

// ─────────────────────── API KEYS ────────────────────
export async function listKeys(userId) {
  const { data, error } = await supabase
    .from('api_keys').select('key,created_at,last_used,calls').eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(k => ({
    key: k.key.slice(0, 12) + '…',
    createdAt: new Date(k.created_at).getTime(),
    lastUsed: k.last_used ? new Date(k.last_used).getTime() : null,
    calls: k.calls || 0,
  }));
}
export async function insertKey(userId, key) {
  const { error } = await supabase.from('api_keys').insert({ user_id: userId, key, calls: 0 });
  if (error) throw error;
}
export async function findKey(key) {
  const { data, error } = await supabase.from('api_keys').select('user_id,key,calls').eq('key', key).maybeSingle();
  if (error) throw error;
  return data;
}
export async function bumpKey(key) {
  await supabase.rpc('boxy_bump_key', { p_key: key }).catch(() => {});
}
export async function revokeKey(userId, prefix) {
  const { data: rows } = await supabase.from('api_keys').select('key').eq('user_id', userId);
  const match = (rows || []).find(r => r.key.startsWith(prefix.replace('…', '')));
  if (!match) return false;
  await supabase.from('api_keys').delete().eq('key', match.key);
  return true;
}

// ─────────────────────── COMMUNITY ───────────────────
export async function communityList() {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, title, description, thumbnail, tags, likes, remixes, comments, created_at, design_id, users(name, avatar)')
    .order('created_at', { ascending: false }).limit(60);
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id, title: p.title, description: p.description, thumbnail: p.thumbnail,
    tags: p.tags || [], likes: p.likes || 0, remixes: p.remixes || 0, comments: p.comments || 0,
    createdAt: new Date(p.created_at).getTime(),
    authorName: p.users?.name || 'someone',
    authorAvatar: p.users?.avatar || null,
    designId: p.design_id,
  }));
}
export async function communityLike(userId, postId) {
  // toggle like via likes table; trigger maintains the counter
  const { data: existing } = await supabase
    .from('community_likes').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle();
  if (existing) await supabase.from('community_likes').delete().eq('id', existing.id);
  else await supabase.from('community_likes').insert({ user_id: userId, post_id: postId });
}
export async function communityRemix(userId, postId) {
  const { data: post } = await supabase.from('community_posts').select('title, design_id').eq('id', postId).maybeSingle();
  if (!post) throw new Error('post not found');
  const { data: src } = await supabase.from('designs').select('dsl, title').eq('id', post.design_id).maybeSingle();
  const { data: copy, error } = await supabase
    .from('designs').insert({
      user_id: userId,
      title: `${src?.title || post.title} (remix)`,
      dsl: src?.dsl || '[]',
    }).select().single();
  if (error) throw error;
  await supabase.rpc('boxy_bump_remixes', { p_post: postId }).catch(() => {});
  return copy.id;
}