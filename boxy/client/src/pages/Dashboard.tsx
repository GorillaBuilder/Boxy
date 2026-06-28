import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

const SUGGESTIONS = [
  'A small enclosure for a 60×30mm PCB with a snap-fit lid',
  'A ceramic coffee mug with a curved handle',
  'A desk lamp arm that rotates on key R',
  'A quadcopter drone frame, four arms',
];

const Send = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { api.listDesigns().then(setDesigns).catch(() => {}); }, []);

  const start = async (prompt?: string) => {
    if (busy) return;
    setBusy(true);
    const title = prompt ? prompt.slice(0, 40) : 'Untitled design';
    const d = await api.createDesign(title);
    nav(`/design/${d.id}`, prompt ? { state: { initial: prompt } } : undefined);
  };

  const first = user?.name?.split(' ')[0];

  return (
    <div className="paper-bg h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-8">
        <div className="flex flex-col items-center pt-[14vh] text-center">
          <p className="text-xs tracking-wide text-paper-500">design with an agent</p>
          <h1 className="display mt-3 text-5xl text-paper-900">
            {first ? <>welcome back, <span className="italic text-paper-500">{first}.</span></> : 'welcome back.'}
          </h1>
          <p className="mt-3 text-sm text-paper-600">Describe a product. Boxy will plan it, build it, and preview it live.</p>

          <div className="fade-up panel mt-9 w-full p-2.5 shadow-card">
            <textarea
              ref={ta} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(text.trim() || undefined); } }}
              rows={2} placeholder="e.g. a water bottle with a screw cap and carry loop…"
              className="max-h-40 w-full resize-none bg-transparent px-2.5 py-2 text-sm text-paper-900 outline-none placeholder:text-paper-400"
            />
            <div className="flex items-center justify-between px-1 pb-0.5">
              <span className="text-2xs text-paper-500">Enter to build · Shift+Enter for new line</span>
              <button className="btn-primary px-3.5 py-1.5" disabled={busy} onClick={() => start(text.trim() || undefined)}>
                {busy ? 'Starting…' : <>Build <Send /></>}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn" onClick={() => start(s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="mt-20 pb-16">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-paper-500">Recent</span>
            <button className="btn-ghost" onClick={() => start()}>+ Blank design</button>
          </div>

          {designs.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-paper-300 py-14 text-center">
              <p className="text-xs text-paper-500">No designs yet — start one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {designs.map((d) => (
                <button key={d.id} onClick={() => nav(`/design/${d.id}`)}
                  className="fade-up group overflow-hidden rounded-xl border border-paper-300 bg-paper-100 text-left shadow-soft transition-all hover:shadow-card">
                  <div className="grid-paper grid h-32 place-items-center overflow-hidden">
                    {d.thumbnail
                      ? <img src={d.thumbnail} alt="" className="h-full w-full object-cover" />
                      : <div className="h-16 w-16 rotate-12 rounded-xl border border-paper-300 bg-gradient-to-br from-paper-200 to-paper-300" />}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="truncate text-xs font-semibold text-paper-900">{d.title}</span>
                    <span className="shrink-0 pl-2 text-2xs text-paper-500">{new Date(d.updated_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
