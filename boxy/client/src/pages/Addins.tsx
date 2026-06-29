import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ApiKey { key: string; createdAt: number; lastUsed?: number; calls?: number; }
interface AddinTool { name: string; description?: string; }
interface Addin {
  id: string; name: string;
  description?: string;
  author?: string;
  version?: string;
  panel?: { url: string; title?: string; icon?: string };
  tools: AddinTool[];
  installed: boolean;
}

const FEATURED: Addin[] = [
  { id: 'fea-quick', name: 'Quick FEA', description: 'Stress estimates on the current part. Highlights weakest face.',
    author: 'community', version: '0.4', tools: [{ name: 'stress_estimate' }, { name: 'weakest_face' }], installed: false },
  { id: 'bom-export', name: 'BOM Export', description: 'Generate a bill of materials with PLA mass, infill estimate, cost per part.',
    author: 'community', version: '0.9', tools: [{ name: 'bom_summary' }, { name: 'csv_export' }], installed: false },
  { id: 'octoprint', name: 'OctoPrint Bridge', description: 'Send the exported STL straight to your home OctoPrint instance.',
    author: 'community', version: '0.2', tools: [{ name: 'send_to_printer' }], installed: false },
];

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}
const I = {
  copy:'M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5L16.5 4H10a2 2 0 0 0-2 0zM4 8v12a2 2 0 0 0 2 2h10',
  trash:'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  plug:'M9 7V3M15 7V3M7 11h10v3a5 5 0 0 1-10 0v-3zM12 19v3',
  plus:'M12 5v14M5 12h14',
  download:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  check:'M20 6 9 17l-5-5',
  external:'M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5',
};

const TIME_AGO = (ts?: number) => {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

export default function Addins() {
  const [tab, setTab] = useState<'installed'|'browse'|'keys'|'developer'>('installed');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [installed, setInstalled] = useState<Addin[]>([]);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = async () => {
    try { setKeys(await api.listKeys()); } catch {}
    try {
      const m = await api.addinsManifest();
      setInstalled((m.addins || []).map((a: any) => ({
        ...a, installed: true,
        tools: m.tools.filter((t: any) => t.name.startsWith(a.id + '.'))
                      .map((t: any) => ({ name: t.name.replace(a.id + '.', ''), description: t.description })),
      })));
    } catch {}
  };
  useEffect(() => { refresh(); }, []);

  const createKey = async () => {
    setCreating(true);
    try {
      const { key } = await api.createKey();
      setRevealed(key);
      await refresh();
    } finally { setCreating(false); }
  };
  const revoke = async (k: string) => {
    if (!confirm('Revoke this key? Any client using it will stop working.')) return;
    await api.revokeKey(k); await refresh();
  };
  const copy = async (txt: string, id: string) => {
    try { await navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch {}
  };

  const totalCalls = keys.reduce((s, k) => s + (k.calls || 0), 0);
  const totalTools = installed.reduce((s, a) => s + a.tools.length, 0);

  return (
    <div className="paper-bg h-full overflow-y-auto">
      <header className="border-b border-paper-300 bg-paper-50 px-8 py-7">
        <div className="mx-auto max-w-5xl">
          <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">extensions</p>
          <h1 className="display mt-2 text-4xl leading-[1.05] text-paper-900">Addins &amp; MCP</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-600">
            Connect external clients via the MCP server, manage API keys, and extend Boxy with addins
            that register their own tools and panels.
          </p>

          {/* stat strip */}
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['installed', installed.length],
              ['tools registered', totalTools + 6],
              ['active keys', keys.length],
              ['total calls', totalCalls],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-xl border border-paper-300 bg-paper-100 p-4">
                <p className="text-2xs uppercase tracking-wider text-paper-500">{label}</p>
                <p className="mt-1.5 font-display text-3xl text-paper-900 tabular-nums">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* tabs */}
      <div className="border-b border-paper-300 bg-paper-50">
        <div className="mx-auto flex max-w-5xl gap-1 px-8">
          {([
            ['installed','Installed'],['browse','Browse'],['keys','API keys'],['developer','Developer'],
          ] as const).map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors
                ${tab===k ? 'border-paper-900 text-paper-900' : 'border-transparent text-paper-500 hover:text-paper-900'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-8 py-8">
        {/* ─── INSTALLED ─── */}
        {tab === 'installed' && (
          <>
            {installed.length === 0 ? (
              <div className="rounded-xl border border-dashed border-paper-300 bg-paper-50 p-10 text-center">
                <Icon d={I.plug} size={28} />
                <p className="mt-4 font-display text-xl text-paper-900">No addins installed yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-paper-600">
                  Drop a folder into <code className="rounded bg-paper-200 px-1 font-mono text-xs">server/addins/&lt;id&gt;/</code> and restart the server.
                  Or browse the featured addins on the next tab.
                </p>
                <button onClick={() => setTab('browse')} className="btn-primary mt-4 text-sm">Browse addins →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {installed.map(a => (
                  <div key={a.id} className="rounded-xl border border-paper-300 bg-paper-50">
                    <div className="flex items-start gap-4 p-5">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-paper-300 bg-paper-100 font-display text-lg text-paper-900">
                        {(a.panel?.icon || a.name[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-xl text-paper-900">{a.name}</h3>
                          {a.version && <span className="chip">v{a.version}</span>}
                          <span className="chip"><Icon d={I.check} size={10} /> active</span>
                        </div>
                        {a.description && <p className="mt-1 text-sm text-paper-600">{a.description}</p>}
                        <p className="mt-2 font-mono text-2xs text-paper-500">{a.id}</p>
                      </div>
                      {a.panel && (
                        <a href={a.panel.url} target="_blank" rel="noreferrer" className="btn-ghost">
                          <Icon d={I.external} /> Panel
                        </a>
                      )}
                    </div>
                    <div className="border-t border-paper-300 bg-paper-100/50 p-4">
                      <p className="mb-2 text-2xs uppercase tracking-wider text-paper-500">tools · {a.tools.length}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {a.tools.map(t => (
                          <div key={t.name} className="rounded-md border border-paper-300 bg-paper-50 px-2 py-1 font-mono text-2xs">
                            <span className="text-paper-400">{a.id}.</span>
                            <span className="text-paper-900">{t.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── BROWSE ─── */}
        {tab === 'browse' && (
          <>
            <p className="text-sm text-paper-600">
              Featured addins from the community. Installation is manual for now — clone into <code className="rounded bg-paper-200 px-1 font-mono text-xs">server/addins/</code>.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {FEATURED.map(a => (
                <div key={a.id} className="rounded-xl border border-paper-300 bg-paper-50 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-xl text-paper-900">{a.name}</h3>
                      <p className="mt-0.5 text-2xs text-paper-500">by {a.author} · v{a.version}</p>
                    </div>
                    <button className="btn" onClick={() => alert('Manual install:\n\ngit clone <repo> server/addins/' + a.id + '\nthen restart the server.')}>
                      <Icon d={I.download} /> Install
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-paper-600">{a.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {a.tools.map(t => <span key={t.name} className="chip">{t.name}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── API KEYS ─── */}
        {tab === 'keys' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-paper-900">API keys</h2>
                <p className="mt-1 text-sm text-paper-600">
                  Used as <code className="rounded bg-paper-200 px-1 font-mono text-xs">x-boxy-key</code> header on the MCP endpoint. Each key is per-user; revoke any time.
                </p>
              </div>
              <button onClick={createKey} disabled={creating} className="btn-primary text-sm">
                <Icon d={I.plus} /> {creating ? 'Creating…' : 'New key'}
              </button>
            </div>

            {revealed && (
              <div className="rounded-xl border border-olive/40 bg-olive/5 p-4">
                <p className="text-2xs font-semibold uppercase tracking-wider text-olive">new key — copy now</p>
                <p className="mt-1 text-xs text-paper-600">
                  This is the only time you'll see the full key. Store it somewhere safe.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-50 p-2.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-paper-900">{revealed}</code>
                  <button onClick={() => copy(revealed, 'reveal')} className="btn-ghost">
                    <Icon d={copied === 'reveal' ? I.check : I.copy} /> {copied === 'reveal' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button onClick={() => setRevealed(null)} className="mt-3 text-2xs text-paper-500 hover:text-paper-900">I've saved it — dismiss</button>
              </div>
            )}

            {keys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-paper-300 bg-paper-50 p-10 text-center">
                <p className="font-display text-xl text-paper-900">No keys yet</p>
                <p className="mt-2 text-sm text-paper-600">Create one to connect Claude Desktop or another MCP client.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-paper-300 bg-paper-50">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-paper-300 bg-paper-100 px-4 py-2.5 text-2xs uppercase tracking-wider text-paper-500">
                  <span>Key</span><span>Calls</span><span>Last used</span><span></span>
                </div>
                {keys.map(k => (
                  <div key={k.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-paper-300/60 px-4 py-3 text-sm last:border-0">
                    <code className="truncate font-mono text-xs text-paper-900">{k.key}</code>
                    <span className="tabular-nums text-paper-600">{k.calls ?? 0}</span>
                    <span className="text-paper-500">{TIME_AGO(k.lastUsed)}</span>
                    <button onClick={() => revoke(k.key)} className="btn-ghost text-rust hover:bg-rust/10">
                      <Icon d={I.trash} size={12} /> Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── DEVELOPER ─── */}
        {tab === 'developer' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl text-paper-900">MCP endpoint</h2>
              <p className="mt-1 text-sm text-paper-600">JSON-RPC 2.0. Send your key as <code className="rounded bg-paper-200 px-1 font-mono text-xs">x-boxy-key</code>.</p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-paper-300 bg-paper-100 p-3 font-mono text-xs text-paper-900">
{`POST /mcp/v1/rpc
x-boxy-key: bxy_xxx
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}`}
              </pre>
            </div>

            <div>
              <h2 className="font-display text-2xl text-paper-900">Calling a tool</h2>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-paper-300 bg-paper-100 p-3 font-mono text-xs text-paper-900">
{`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "design.create",
    "arguments": { "title": "Bracket v2" }
  }
}`}
              </pre>
            </div>

            <div>
              <h2 className="font-display text-2xl text-paper-900">Writing an addin</h2>
              <p className="mt-1 text-sm text-paper-600">
                A folder in <code className="rounded bg-paper-200 px-1 font-mono text-xs">server/addins/&lt;id&gt;/</code> with a default export. See <a className="underline" href="/docs#addins">docs</a>.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-paper-300 bg-paper-100 p-3 font-mono text-xs text-paper-900">
{`export default {
  id: 'my-addin',
  name: 'My Addin',
  panel: { url: '/addins/my-addin/panel.html', title: 'Panel' },
  tools: [{
    name: 'do_thing',
    description: 'Does the thing',
    input: { type:'object', properties:{ x:{ type:'number' } } },
    run: async ({ userId, params }) => ({ result: params.x * 2 }),
  }],
};`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}