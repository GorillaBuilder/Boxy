// Old-school Google OAuth flow that writes users straight into Supabase.
// The server is the only thing that touches Supabase Auth-wise — we never
// involve Supabase Auth itself. Users are rows in public.users keyed by a
// generated UUID, NOT by auth.users.id.

import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { supabase } from './db.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET = 'dev-secret-change-me',
  CLIENT_URL = 'http://localhost:5173',
} = process.env;

// OAuth completes on the client origin (Vite proxies /api -> server) so the
// cookie lands same-origin. Override OAUTH_BASE for Codespaces / deploys.
const OAUTH_BASE = process.env.OAUTH_BASE || CLIENT_URL;
const REDIRECT_URI = `${OAUTH_BASE}/api/auth/google/callback`;

export function googleAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('token exchange failed: ' + (await res.text()));
  const { access_token } = await res.json();
  const profRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profRes.ok) throw new Error('userinfo failed');
  return profRes.json();
}

// Upsert user into Supabase public.users. We never touch auth.users — so the
// schema's FK from public.users.id → auth.users.id must be relaxed (see notes).
export async function upsertUserManual(profile) {
  // Try to find existing user by google_id or email.
  const { data: existing } = await supabase
    .from('users').select('*')
    .or(`google_id.eq.${profile.id},email.eq.${profile.email}`)
    .maybeSingle();
  if (existing) {
    const patch = {
      name: profile.name,
      avatar: profile.picture,
      google_id: profile.id,
    };
    const { data, error } = await supabase
      .from('users').update(patch).eq('id', existing.id).select().single();
    if (error) throw error;
    return data;
  }
  const id = randomUUID();
  const { data, error } = await supabase
    .from('users').insert({
      id,
      email: profile.email,
      name: profile.name,
      avatar: profile.picture,
      google_id: profile.id,
    }).select().single();
  if (error) throw error;
  return data;
}

export function issueToken(user) {
  return jwt.sign({ uid: user.id }, SESSION_SECRET, { expiresIn: '30d' });
}

export async function authRequired(req, res, next) {
  const token = req.cookies?.boxy_session;
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const { uid } = jwt.verify(token, SESSION_SECRET);
    const { data: user, error } = await supabase
      .from('users').select('*').eq('id', uid).maybeSingle();
    if (error || !user) return res.status(401).json({ error: 'unauthenticated' });
    req.user = { id: user.id, email: user.email, name: user.name, avatar: user.avatar };
    next();
  } catch {
    return res.status(401).json({ error: 'unauthenticated' });
  }
}

export const CLIENT = CLIENT_URL;