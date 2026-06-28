import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ManifestTool { name: string; description: string; addin: string; }
interface AddinMeta { id: string; name: string; panel: { url: string; title?: string; icon?: string } | null; }

export default function Addins() {
  const [manifest, setManifest] = useState<{ tools: ManifestTool[]; addins: AddinMeta[] }>({ tools: [], addins: [] });
  const [keys, setKeys] = useState<{ key: string; createdAt: number }[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = async () => {
    setManifest(await api.addinsManifest());
    setKeys(await api.listKeys());
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const { key } = await api.createKey();
    setNewKey(key);
    load();
  };

  const grouped = manifest.tools.reduce<Record<string, ManifestTool[]>>((acc, t) => {
    (acc[t.addin] = acc[t.addin] || []).push(t); return acc;
  }, {});

  return (
    <div className="paper-bg h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-10 py-12">
        <p className="text-xs tracking-wide text-paper-500">extend Boxy</p>
        <h1 className="display mt-2 text-4xl text-paper-900">addins & MCP</h1>
        <p className="mt-3 max-w-xl text-sm text-paper-600">
          Boxy exposes a JSON-RPC + SSE MCP server. Connect external agents (Claude Desktop,
          custom clients) with an API key, or drop a folder into <code className="rounded bg-paper-200 px-1 text-2xs">server/addins/</code> to register your own tools and UI panels.
        </p>

        {/* API keys */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-paper-500">MCP API keys</h2>
          <div className="panel mt-3 p-4">
            {newKey && (
              <div className="mb-4 rounded-lg border border-olive/30 bg-olive/10 p-3">
                <p className="text-2xs font-semibold uppercase tracking-wider text-olive">copy now — shown once</p>
                <code className="mt-2 block break-all rounded bg-paper-50 p-2 font-mono text-xs text-paper-900">{newKey}</code>
              </div>
            )}
            <div className="space-y-1.5">
              {keys.length === 0 && <p className="text-xs text-paper-500">No keys yet.</p>}
              {keys.map((k) => (
                <div key={k.key} className="flex items-center justify-between rounded-lg border border-paper-300 bg-paper-50 px-3 py-2">
                  <code className="font-mono text-xs text-paper-900">{k.key}</code>
                  <span className="text-2xs text-paper-500">{new Date(k.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary mt-3" onClick={create}>Generate new key</button>
          </div>
          <div className="mt-3 rounded-lg border border-paper-300 bg-paper-100 p-4 font-mono text-2xs text-paper-600">
            <p className="mb-1 text-paper-500"># connect from an MCP client</p>
            <p>POST /mcp/v1/rpc</p>
            <p>headers: x-boxy-key: &lt;your-key&gt;</p>
            <p>body: {`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`}</p>
          </div>
        </section>

        {/* Installed addins */}
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-paper-500">Installed</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="panel p-4">
              <p className="font-display text-lg text-paper-900">core</p>
              <p className="mt-1 text-xs text-paper-500">Boxy's built-in canvas tools.</p>
              <div className="mt-3 space-y-1">
                {(grouped.core || []).map((t) => (
                  <div key={t.name} className="rounded-md bg-paper-200/60 px-2 py-1 font-mono text-2xs text-paper-900">{t.name}</div>
                ))}
              </div>
            </div>
            {manifest.addins.map((a) => (
              <div key={a.id} className="panel p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-paper-900">{a.name}</p>
                  {a.panel && <span className="chip">panel</span>}
                </div>
                <p className="mt-1 text-xs text-paper-500">id: {a.id}</p>
                <div className="mt-3 space-y-1">
                  {(grouped[a.id] || []).map((t) => (
                    <div key={t.name} className="rounded-md bg-paper-200/60 px-2 py-1 font-mono text-2xs text-paper-900">{t.name}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-paper-300 bg-paper-100 p-5 text-sm text-paper-600">
          <p className="font-display text-lg text-paper-900">Write your own addin</p>
          <p className="mt-2">Create <code className="rounded bg-paper-200 px-1 text-2xs">server/addins/&lt;id&gt;/index.js</code> exporting a default object with <code>id</code>, <code>name</code>, optional <code>panel.url</code>, and a <code>tools</code> array. Restart the server to load.</p>
        </section>
      </div>
    </div>
  );
}
