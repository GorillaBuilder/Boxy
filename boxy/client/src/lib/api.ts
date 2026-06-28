const J = { 'Content-Type': 'application/json' };
const opt = (m: string, body?: any): RequestInit => ({
  method: m, headers: J, credentials: 'include',
  ...(body ? { body: JSON.stringify(body) } : {}),
});

export const api = {
  me: () => fetch('/api/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
  logout: () => fetch('/api/auth/logout', opt('POST')),

  // designs
  listDesigns: () => fetch('/api/designs', { credentials: 'include' }).then(r => r.json()),
  createDesign: (title: string) => fetch('/api/designs', opt('POST', { title })).then(r => r.json()),
  getDesign: (id: string) => fetch(`/api/designs/${id}`, { credentials: 'include' }).then(r => r.json()),
  patchDesign: (id: string, body: any) => fetch(`/api/designs/${id}`, opt('PATCH', body)).then(r => r.json()),
  deleteDesign: (id: string) => fetch(`/api/designs/${id}`, opt('DELETE')).then(r => r.json()),
  agent: (body: any) => fetch('/api/agent', opt('POST', body)).then(r => r.json()),

  // addins + MCP
  addinsManifest: () => fetch('/api/addins/manifest', { credentials: 'include' }).then(r => r.json()),
  listKeys: () => fetch('/api/keys', { credentials: 'include' }).then(r => r.json()),
  createKey: () => fetch('/api/keys', opt('POST')).then(r => r.json()),
  revokeKey: (key: string) => fetch(`/api/keys/${encodeURIComponent(key)}`, opt('DELETE')).then(r => r.json()),
  // Calls an addin tool from inside an iframe panel through the authenticated session.
  callAddinTool: (name: string, args: any) =>
    fetch('/api/addins/call', opt('POST', { name, args })).then(r => r.json().then(j => {
      if (!r.ok) throw new Error(j.error || 'addin call failed');
      return j;
    })),
};
export const googleLoginUrl = '/api/auth/google';
