import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

const MODELS = [
  { id: 'anthropic/claude-opus-4-8', label: 'Claude Opus 4.8', note: 'strongest tool-use + critique. $5/$25 per M.' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', note: 'fast, strong JSON discipline.' },
  { id: 'google/gemini-2.5-pro',     label: 'Gemini 2.5 Pro',  note: 'great spatial reasoning, cheaper.' },
  { id: 'openai/gpt-4o',             label: 'GPT-4o',          note: 'solid vision, decent at JSON.' },
];

const TIME_AGO = (ts?: number) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

export default function Profile() {
  const { user, model, logout, refresh } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<'designs'|'settings'|'account'>('designs');
  const [designs, setDesigns] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({ bio: '', preferredModel: model });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listDesigns().then(setDesigns).catch(() => {});
    api.getProfile().then(p => setProfile({ bio: p?.bio || '', preferredModel: p?.preferredModel || model })).catch(() => {});
  }, [model]);

  const save = async () => {
    setSaving(true);
    try { await api.updateProfile(profile); await refresh(); } catch (e) { alert('Save failed: ' + String((e as Error).message)); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!confirm('Delete your account? This wipes all designs, messages, and keys. Cannot be undone.')) return;
    if (!confirm('Really? This is permanent.')) return;
    try { await api.deleteAccount(); await logout(); nav('/'); } catch (e) { alert('Delete failed: ' + String((e as Error).message)); }
  };

  const totalOps = designs.reduce((s, d) => {
    try { return s + JSON.parse(d.dsl || '[]').length; } catch { return s; }
  }, 0);

  if (!user) return null;

  return (
    <div className="paper-bg h-full overflow-y-auto">
      <header className="border-b border-paper-300 bg-paper-50 px-8 py-7">
        <div className="mx-auto flex max-w-5xl items-start gap-5">
          {user.avatar
            ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-2xl border border-paper-300" />
            : <div className="grid h-16 w-16 place-items-center rounded-2xl border border-paper-300 bg-paper-100 font-display text-2xl text-paper-900">
                {user.name?.[0]}
              </div>}
          <div className="min-w-0 flex-1">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">profile</p>
            <h1 className="display mt-1 truncate text-4xl leading-[1.05] text-paper-900">{user.name}</h1>
            <p className="mt-1 text-sm text-paper-500">{user.email}</p>
            {profile.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-600">{profile.bio}</p>}
          </div>
        </div>

        <div className="mx-auto mt-7 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['designs', designs.length],
            ['total ops', totalOps],
            ['model', (profile.preferredModel || model || '').split('/').pop() || '—'],
            ['member since', user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'],
          ].map(([label, val]) => (
            <div key={label as string} className="rounded-xl border border-paper-300 bg-paper-100 p-4">
              <p className="text-2xs uppercase tracking-wider text-paper-500">{label}</p>
              <p className="mt-1.5 truncate font-display text-2xl text-paper-900">{val as any}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="border-b border-paper-300 bg-paper-50">
        <div className="mx-auto flex max-w-5xl gap-1 px-8">
          {([['designs','My designs'],['settings','Settings'],['account','Account']] as const).map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors
                ${tab===k ? 'border-paper-900 text-paper-900' : 'border-transparent text-paper-500 hover:text-paper-900'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-8 py-8">
        {/* DESIGNS */}
        {tab === 'designs' && (
          designs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-paper-300 bg-paper-50 p-10 text-center">
              <p className="font-display text-xl text-paper-900">No designs yet</p>
              <p className="mt-2 text-sm text-paper-600">Start one from the home page.</p>
              <Link to="/dashboard" className="btn-primary mt-4 inline-flex text-sm">Go home →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {designs.map(d => {
                let opCount = 0;
                try { opCount = JSON.parse(d.dsl || '[]').length; } catch {}
                return (
                  <Link key={d.id} to={`/design/${d.id}`}
                    className="overflow-hidden rounded-xl border border-paper-300 bg-paper-50 transition-shadow hover:shadow-card">
                    <div className="grid-paper aspect-[16/10] border-b border-paper-300 bg-paper-100">
                      {d.thumbnail
                        ? <img src={d.thumbnail} alt="" className="h-full w-full object-cover" />
                        : <div className="grid h-full place-items-center"><div className="h-12 w-12 rotate-12 rounded-xl border border-paper-300 bg-paper-200" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="truncate font-display text-base text-paper-900">{d.title}</p>
                      <p className="mt-0.5 text-2xs text-paper-500">{opCount} ops · {TIME_AGO(d.updatedAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <>
            <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
              <h2 className="font-display text-2xl text-paper-900">Bio</h2>
              <p className="mt-1 text-sm text-paper-600">Shown on your public community profile.</p>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
                rows={3}
                maxLength={240}
                placeholder="Hardware tinkerer. Industrial designer. 3D printing nerd…"
                className="mt-3 w-full resize-none rounded-lg border border-paper-300 bg-paper-100 px-3 py-2 text-sm text-paper-900 outline-none focus:border-paper-400"
              />
              <p className="mt-1 text-2xs text-paper-500">{profile.bio.length}/240</p>
            </div>

            <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
              <h2 className="font-display text-2xl text-paper-900">Preferred model</h2>
              <p className="mt-1 text-sm text-paper-600">
                The agent runs whichever model is set in <code className="rounded bg-paper-200 px-1 font-mono text-xs">server/.env</code> globally.
                Your preference here is used when an addin lets you override per-tool.
              </p>
              <div className="mt-4 space-y-2">
                {MODELS.map(m => (
                  <label key={m.id} className={`flex cursor-none items-center gap-3 rounded-lg border p-3 transition-colors
                    ${profile.preferredModel === m.id ? 'border-paper-900 bg-paper-100' : 'border-paper-300 hover:bg-paper-100'}`}>
                    <input type="radio" name="model" checked={profile.preferredModel === m.id}
                      onChange={() => setProfile((p: any) => ({ ...p, preferredModel: m.id }))}
                      className="accent-paper-900" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-paper-900">{m.label}</p>
                      <p className="text-2xs text-paper-500">{m.note}</p>
                    </div>
                    <code className="font-mono text-2xs text-paper-400">{m.id}</code>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={save} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        )}

        {/* ACCOUNT */}
        {tab === 'account' && (
          <>
            <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
              <h2 className="font-display text-2xl text-paper-900">Connected accounts</h2>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-paper-300 bg-paper-100 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-paper-50">G</div>
                  <div>
                    <p className="text-sm font-semibold text-paper-900">Google</p>
                    <p className="text-2xs text-paper-500">{user.email}</p>
                  </div>
                </div>
                <span className="chip">primary</span>
              </div>
            </div>

            <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
              <h2 className="font-display text-2xl text-paper-900">Session</h2>
              <p className="mt-1 text-sm text-paper-600">Sign out everywhere this session is active.</p>
              <button onClick={() => logout().then(() => nav('/login'))} className="btn mt-4 text-sm">Sign out</button>
            </div>

            <div className="rounded-xl border border-rust/40 bg-rust/5 p-5">
              <h2 className="font-display text-2xl text-rust">Danger zone</h2>
              <p className="mt-1 text-sm text-paper-600">Permanently delete your account and all your data. Cannot be undone.</p>
              <button onClick={remove} className="btn mt-4 border-rust/40 text-rust hover:bg-rust/10">Delete account</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}