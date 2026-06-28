// Zero-dependency, file-based JSON store. No native build, no Supabase.
// Persists to server/db/boxy.json (created automatically).
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { nanoid } from 'nanoid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'db');
mkdirSync(DIR, { recursive: true });
const FILE = join(DIR, 'boxy.json');

let data = { users: [], designs: [], messages: [], apiKeys: [] };
if (existsSync(FILE)) {
  try { data = { ...data, ...JSON.parse(readFileSync(FILE, 'utf8')) }; } catch { /* start fresh */ }
}
let writeTimer = null;
function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => writeFileSync(FILE, JSON.stringify(data, null, 2)), 50);
}

export const store = {
  // users
  findUser: ({ googleId, email, id }) =>
    data.users.find(u =>
      (id && u.id === id) || (googleId && u.googleId === googleId) || (email && u.email === email)),
  insertUser: (u) => { const row = { id: nanoid(), createdAt: Date.now(), ...u }; data.users.push(row); persist(); return row; },
  updateUser: (id, patch) => { const u = data.users.find(x => x.id === id); if (u) Object.assign(u, patch); persist(); return u; },

  // designs
  listDesigns: (userId) =>
    data.designs.filter(d => d.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ id, title, thumbnail, updatedAt }) => ({ id, title, thumbnail, updated_at: updatedAt })),
  getDesign: (id, userId) => data.designs.find(d => d.id === id && d.userId === userId),
  insertDesign: (userId, title) => {
    const now = Date.now();
    const row = { id: nanoid(), userId, title, dsl: '[]', thumbnail: null, createdAt: now, updatedAt: now };
    data.designs.push(row); persist(); return row;
  },
  updateDesign: (id, patch) => {
    const d = data.designs.find(x => x.id === id); if (!d) return null;
    Object.assign(d, patch, { updatedAt: Date.now() }); persist(); return d;
  },
  deleteDesign: (id, userId) => {
    data.designs = data.designs.filter(d => !(d.id === id && d.userId === userId));
    data.messages = data.messages.filter(m => m.designId !== id); persist();
  },

  // messages
  listMessages: (designId) =>
    data.messages.filter(m => m.designId === designId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(m => ({ id: m.id, role: m.role, content: m.content, created_at: m.createdAt })),
  insertMessage: (designId, role, content) => {
    data.messages.push({ id: nanoid(), designId, role, content, createdAt: Date.now() }); persist();
  },

  // api keys (for MCP server)
  listApiKeys: () => data.apiKeys.slice(),
  insertApiKey: ({ key, userId }) => {
    data.apiKeys.push({ key, userId, createdAt: Date.now() }); persist();
  },
  deleteApiKey: (key) => {
    data.apiKeys = data.apiKeys.filter(k => k.key !== key); persist();
  },
};

export default store;
