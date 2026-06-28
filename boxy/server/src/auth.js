import jwt from 'jsonwebtoken';
import { store } from './db.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SESSION_SECRET = 'dev-secret',
  SERVER_URL = 'http://localhost:8787',
  CLIENT_URL = 'http://localhost:5173',
} = process.env;

// OAuth completes on the client origin (Vite proxies /api -> server) so the cookie
// lands same-origin with /api/me calls. Override OAUTH_BASE for Codespaces / deploys.
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

export function upsertUser(profile) {
  const existing = store.findUser({ googleId: profile.id, email: profile.email });
  if (existing) {
    return store.updateUser(existing.id, {
      name: profile.name, avatar: profile.picture, googleId: profile.id,
    });
  }
  return store.insertUser({
    googleId: profile.id, email: profile.email, name: profile.name, avatar: profile.picture,
  });
}

export function issueToken(user) {
  return jwt.sign({ uid: user.id }, SESSION_SECRET, { expiresIn: '30d' });
}

export function authRequired(req, res, next) {
  const token = req.cookies?.boxy_session;
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const { uid } = jwt.verify(token, SESSION_SECRET);
    const user = store.findUser({ id: uid });
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    req.user = { id: user.id, email: user.email, name: user.name, avatar: user.avatar };
    next();
  } catch {
    return res.status(401).json({ error: 'unauthenticated' });
  }
}

export const CLIENT = CLIENT_URL;
