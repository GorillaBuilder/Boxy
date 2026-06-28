import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Viewer, { ViewerHandle } from '../components/Viewer';
import AddinPanel from '../components/AddinPanel';
import { useAgent, ChatItem } from '../hooks/useAgent';
import { api } from '../lib/api';
import { exportSTL, exportOBJ, exportGLB } from '../engine/exporters';

const Send = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const Camera = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const Download = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);
const BotMark = () => (
  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-paper-300 bg-paper-100">
    <div className="relative h-3 w-3">
      <div className="absolute inset-0 rounded-sm bg-blue/70" />
      <div className="absolute inset-[22%] rounded-[1px] bg-paper-50" />
    </div>
  </div>
);

function OpLogBlock({ ops }: { ops: NonNullable<ChatItem['ops']> }) {
  if (!ops.length) return null;
  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border border-paper-300 bg-paper-50 font-mono text-2xs">
      <div className="flex items-center gap-1.5 border-b border-paper-300 px-2.5 py-1.5 text-paper-500">
        <span className="h-2 w-2 rounded-full bg-olive/70" />
        boxydsl · {ops.length} op{ops.length > 1 ? 's' : ''}
      </div>
      <div className="divide-y divide-paper-300/60">
        {ops.map((o, i) => (
          <div key={i} className="fade-up flex items-center gap-2 px-2.5 py-1.5">
            <span className="rounded bg-paper-200 px-1.5 py-0.5 font-semibold text-paper-900">{o.label}</span>
            <span className="truncate text-paper-600">{o.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Critique({ c }: { c: { issues: string[] } }) {
  if (!c?.issues?.length) return null;
  return (
    <div className="mt-2.5 rounded-lg border border-rust/30 bg-rust/5 p-2.5">
      <p className="text-2xs font-semibold uppercase tracking-wider text-rust">critique</p>
      <ul className="mt-1.5 space-y-1 text-xs text-paper-900">
        {c.issues.map((s, i) => <li key={i}>· {s}</li>)}
      </ul>
    </div>
  );
}

function Bubble({ m }: { m: ChatItem }) {
  if (m.role === 'user') {
    return (
      <div className="fade-up flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          {m.attachment && (
            <img src={m.attachment} alt="attached snapshot"
              className="max-h-40 w-auto rounded-lg border border-paper-300 shadow-soft" />
          )}
          <div className="rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-sm leading-relaxed text-paper-50">{m.text}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="fade-up flex justify-start">
      <div className="flex max-w-[92%] gap-2.5">
        <BotMark />
        <div className="min-w-0 rounded-2xl rounded-tl-md border border-paper-300 bg-paper-100 px-3.5 py-2.5 text-sm leading-relaxed text-paper-900">
          <span>{m.text}{m.streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 -translate-y-px animate-pulse bg-paper-900 align-middle" />}</span>
          {m.plan && m.plan.length > 0 && (
            <ol className="mt-2.5 space-y-1.5 border-t border-paper-300 pt-2.5 text-xs text-paper-600">
              {m.plan.map((p, j) => (
                <li key={j} className="flex gap-2">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-paper-200 text-[9px] font-bold text-paper-900">{j + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          )}
          {m.ops && <OpLogBlock ops={m.ops} />}
          {m.critique && <Critique c={m.critique} />}
        </div>
      </div>
    </div>
  );
}

export default function Design() {
  const { id = '' } = useParams();
  const location = useLocation();
  const viewer = useRef<ViewerHandle>(null);
  const { messages, ops, thinking, status, send, hydrate } = useAgent(id, viewer);
  const [input, setInput] = useState('');
  const [attached, setAttached] = useState<string | null>(null); // queued snapshot data URL
  const [title, setTitle] = useState('Untitled design');
  const [addinPanel, setAddinPanel] = useState<{ url: string; title?: string } | null>(null);
  const [addins, setAddins] = useState<any[]>([]);
  const [renderEmpty, setRenderEmpty] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    api.getDesign(id).then(({ design, messages: msgs }) => {
      setTitle(design.title);
      const savedOps = JSON.parse(design.dsl || '[]');
      const chat: ChatItem[] = msgs.map((mm: any) =>
        mm.role === 'user'
          ? { role: 'user', text: typeof mm.content === 'string' ? mm.content : '' }
          : { role: 'assistant', text: mm.content?.say || '', plan: mm.content?.plan, critique: mm.content?.critique });
      hydrate(savedOps, chat, msgs.map((mm: any) => ({ role: mm.role, content: mm.content })));
    }).catch(() => {});
    api.addinsManifest().then(m => setAddins(m.addins || [])).catch(() => {});
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }); }, [messages, status]);

  useEffect(() => {
    const initial = (location.state as any)?.initial;
    if (initial && !fired.current) {
      fired.current = true;
      window.history.replaceState({}, '');
      setTimeout(() => send(initial), 500);
    }
  }, [location.state, send]);

  useEffect(() => {
    if (!ops.length) { setRenderEmpty(false); return; }
    const t = setTimeout(() => {
      const b = viewer.current?.bbox?.();
      const s = b?.size;
      setRenderEmpty(Array.isArray(s) && s[0] === 0 && s[1] === 0 && s[2] === 0);
    }, 600);
    return () => clearTimeout(t);
  }, [ops]);

  // capture current canvas into the composer attachment queue
  const attachSnapshot = () => {
    const url = viewer.current?.snapshot?.();
    if (url) setAttached(url);
  };
  // download current canvas as a PNG file for the user
  const downloadSnapshot = () => {
    const url = viewer.current?.snapshot?.();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'boxy'}.jpg`;
    a.click();
  };

  const submit = () => {
    const t = input.trim();
    if ((!t && !attached) || thinking) return;
    const snap = attached || undefined;
    setInput(''); setAttached(null);
    send(t || 'Look at this and suggest the next step.', snap);
  };
  const saveTitle = (t: string) => { setTitle(t); api.patchDesign(id, { title: t }); };
  const joints = viewer.current?.joints?.() || [];
  const studio = ops.length > 0;

  const StatusLine = status ? (
    <div className="fade-up flex items-center gap-2 px-1 text-xs text-paper-500">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-paper-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-paper-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-paper-400" />
      </span>
      {status}…
    </div>
  ) : null;

  const Composer = (
    <div className="panel p-2 shadow-soft">
      {attached && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-paper-300 bg-paper-50 p-1.5">
          <img src={attached} alt="" className="h-10 w-12 rounded object-cover" />
          <div className="flex-1 text-2xs text-paper-600">
            <p className="font-semibold text-paper-900">Snapshot attached</p>
            <p className="text-paper-500">The agent will see this with your next message.</p>
          </div>
          <button onClick={() => setAttached(null)} title="Remove"
            className="grid h-6 w-6 place-items-center rounded-md text-paper-500 hover:bg-paper-200 hover:text-paper-900">×</button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {studio && (
          <button
            onClick={attachSnapshot}
            disabled={thinking}
            title="Attach screenshot of the canvas"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-paper-300 bg-paper-50 text-paper-600 transition-colors hover:bg-paper-100 hover:text-paper-900 disabled:opacity-40">
            <Camera />
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          rows={1}
          placeholder={studio ? 'Refine, add parts, rig joints, or delete something…' : 'Describe the product you want to build…'}
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-paper-900 outline-none placeholder:text-paper-400"
        />
        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-paper-50 transition-all duration-150 enabled:hover:brightness-110 disabled:opacity-40"
          disabled={thinking || (!input.trim() && !attached)}
          onClick={submit}
          title="Send">
          <Send />
        </button>
      </div>
    </div>
  );

  /* ─── CHAT MODE ─── */
  if (!studio) {
    const empty = messages.length === 0;
    return (
      <div className="paper-bg grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 border-b border-paper-300 px-5 py-3">
          <input value={title} onChange={(e) => saveTitle(e.target.value)}
            className="bg-transparent text-sm font-bold text-paper-900 outline-none" />
        </header>
        {empty ? (
          <div className="flex min-h-0 items-center justify-center overflow-hidden px-5">
            <div className="flex max-w-md flex-col items-center text-center">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-paper-300 bg-paper-100">
                <div className="relative h-7 w-7">
                  <div className="absolute inset-0 rounded-md bg-blue/70" />
                  <div className="absolute inset-[18%] rounded-sm bg-paper-50" />
                </div>
              </div>
              <h2 className="display text-3xl text-paper-900">describe what to build</h2>
              <p className="mt-3 text-sm text-paper-600">
                Boxy plans the build, then assembles it step by step. The live canvas opens once the first parts take shape.
              </p>
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 overflow-y-auto px-5 py-6">
            <div className="mx-auto w-full max-w-2xl space-y-4">
              {messages.map((m, i) => <Bubble key={i} m={m} />)}
              {StatusLine}
            </div>
          </div>
        )}
        <div className="shrink-0 border-t border-paper-300 bg-paper-50 px-5 py-4">
          <div className="mx-auto w-full max-w-2xl">{Composer}</div>
        </div>
      </div>
    );
  }

  /* ─── STUDIO MODE ─── */
  return (
    <div className="grid h-full min-h-0 grid-cols-[440px_1fr] overflow-hidden bg-paper-50">
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-paper-300 bg-paper-100">
        <header className="flex shrink-0 items-center gap-2 border-b border-paper-300 px-4 py-3">
          <input value={title} onChange={(e) => saveTitle(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-paper-900 outline-none" />
          <span className="chip shrink-0">{ops.length} ops</span>
        </header>
        <div ref={scrollRef} className="min-h-0 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {StatusLine}
          </div>
        </div>
        <div className="shrink-0 border-t border-paper-300 bg-paper-50 p-3">{Composer}</div>
      </div>

      <div className="relative flex min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-paper-300 bg-paper-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="chip">live preview</span>
            {joints.length > 0 && <span className="chip">{joints.length} joint{joints.length > 1 ? 's' : ''}</span>}
            {addins.filter(a => a.panel).map(a => (
              <button key={a.id} className="btn-ghost"
                onClick={() => setAddinPanel(addinPanel?.url === a.panel.url ? null : { url: a.panel.url, title: a.panel.title || a.name })}>
                {a.panel.icon || '+'} {a.panel.title || a.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button className="btn" onClick={attachSnapshot} title="Send to chat">
              <Camera /> Send to chat
            </button>
            <button className="btn" onClick={downloadSnapshot} title="Download as image">
              <Download /> Save .jpg
            </button>
            <span className="mx-1 h-4 w-px bg-paper-300" />
            <span className="mr-1 text-2xs text-paper-500">Export</span>
            <button className="btn" onClick={() => viewer.current?.root() && exportSTL(viewer.current.root()!, `${title}.stl`)}>STL</button>
            <button className="btn" onClick={() => viewer.current?.root() && exportOBJ(viewer.current.root()!, `${title}.obj`)}>OBJ</button>
            <button className="btn" onClick={() => viewer.current?.root() && exportGLB(viewer.current.root()!, `${title}.glb`)}>GLB</button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 grid-paper">
          <Viewer ref={viewer} ops={ops} />

          {renderEmpty && !thinking && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="pointer-events-auto max-w-sm rounded-xl border border-paper-300 bg-paper-50/95 p-5 text-center shadow-card backdrop-blur">
                <p className="font-display text-xl text-paper-900">no geometry yet</p>
                <p className="mt-2 text-xs leading-relaxed text-paper-600">
                  The agent emitted ops but they didn't produce a visible mesh. This usually
                  means a <code className="rounded bg-paper-200 px-1 font-mono">shell</code> or
                  <code className="rounded bg-paper-200 px-1 font-mono">boolean</code> referenced
                  a part that hadn't been created yet, or a <code className="rounded bg-paper-200 px-1 font-mono">lathe</code> profile was malformed.
                </p>
              </div>
            </div>
          )}

          {joints.length > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-paper-300 bg-paper-50/95 px-3 py-1.5 text-2xs text-paper-600 backdrop-blur">
              Rig: {joints.map((j) => `press "${j.key}" to move ${j.target}`).join(' · ')}
            </div>
          )}
          {addinPanel && (
            <div className="absolute right-3 top-3 h-[calc(100%-24px)] w-[300px] overflow-hidden rounded-xl border border-paper-300 bg-paper-100 shadow-window">
              <div className="flex items-center justify-between border-b border-paper-300 px-3 py-2 text-xs">
                <span className="font-semibold text-paper-900">{addinPanel.title}</span>
                <button className="btn-ghost px-1.5" onClick={() => setAddinPanel(null)}>×</button>
              </div>
              <div className="h-[calc(100%-37px)]"><AddinPanel url={addinPanel.url} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}