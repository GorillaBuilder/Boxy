import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Post {
  id: string;
  title: string;
  authorName: string;
  authorAvatar?: string;
  thumbnail?: string;
  description?: string;
  likes: number;
  remixes: number;
  comments: number;
  liked?: boolean;
  createdAt: number;
  tags?: string[];
}

const TIME_AGO = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(ts).toLocaleDateString();
};

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}
const I = {
  heart:   'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  remix:   'M16 3h5v5M4 20 21 3M21 16v5h-5M4 4l5 5',
  comment: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  flame:   'M12 23s8-5 8-13c0-3-1-5-3-7 0 4-3 6-3 6s-2-3-2-7c-4 2-6 5-6 9 0 8 6 12 6 12z',
  trend:   'M23 6 13.5 15.5 8.5 10.5 1 18M17 6h6v6',
};

// fallback seed for first-run when the community table is empty
const SEED: Post[] = [
  { id: 's1', title: 'Magnetic spice rack', authorName: 'Sofie K.', likes: 142, remixes: 18, comments: 9,
    createdAt: Date.now() - 3*3600e3, tags: ['kitchen','magnetic'],
    description: 'Six magnetic jars in a circular pattern. The base shells to 2mm and I added screw holes for under-cabinet mounting.' },
  { id: 's2', title: 'Articulated desk lamp', authorName: 'Mira R.', likes: 89, remixes: 24, comments: 12,
    createdAt: Date.now() - 14*3600e3, tags: ['lighting','rigged'],
    description: 'Three-segment chain with Q/W/E key bindings. Pivots are face-snapped so the arm stays connected through compound motion.' },
  { id: 's3', title: 'Phone stand v3', authorName: 'Alex T.', likes: 56, remixes: 8, comments: 4,
    createdAt: Date.now() - 36*3600e3, tags: ['accessories','daily-use'],
    description: 'Cable slot under the base, panel hinges flat for transport. Bound R key to the hinge.' },
];

export default function Community() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'feed'|'trending'|'mine'>('feed');
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const list = await api.communityList();
      setPosts(list.length ? list : SEED);
    } catch {
      setPosts(SEED);
    } finally { setLoading(false); }
  })(); }, []);

  const toggleLike = async (id: string) => {
    setPosts(p => p.map(x => x.id === id
      ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }
      : x));
    try { await api.communityLike(id); } catch {}
  };
  const remix = async (id: string) => {
    try {
      const { designId } = await api.communityRemix(id);
      window.location.href = `/design/${designId}`;
    } catch (e) { alert('Could not remix: ' + String((e as Error).message)); }
  };

  const sorted = tab === 'trending'
    ? [...posts].sort((a,b) => (b.likes + b.remixes*2) - (a.likes + a.remixes*2))
    : posts;

  return (
    <div className="paper-bg h-full overflow-y-auto">
      <header className="border-b border-paper-300 bg-paper-50 px-8 py-7">
        <div className="mx-auto max-w-5xl">
          <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">community</p>
          <h1 className="display mt-2 text-4xl leading-[1.05] text-paper-900">
            what people are <span className="italic text-paper-500">building.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-600">
            Browse designs shared by the community. Remix any one into your workspace and the agent
            picks up where the original author left off.
          </p>
        </div>
      </header>

      <div className="border-b border-paper-300 bg-paper-50">
        <div className="mx-auto flex max-w-5xl gap-1 px-8">
          {([['feed','Feed'],['trending','Trending'],['mine','My posts']] as const).map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors
                ${tab===k ? 'border-paper-900 text-paper-900' : 'border-transparent text-paper-500 hover:text-paper-900'}`}>
              {k === 'trending' && <Icon d={I.flame} size={12} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {loading ? (
          <p className="text-sm text-paper-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sorted.map(p => (
              <article key={p.id} className="overflow-hidden rounded-xl border border-paper-300 bg-paper-50 transition-shadow hover:shadow-card">
                {/* thumb */}
                <div className="grid-paper relative aspect-[16/10] border-b border-paper-300 bg-paper-100">
                  {p.thumbnail
                    ? <img src={p.thumbnail} alt={p.title} className="h-full w-full object-cover" />
                    : <div className="grid h-full place-items-center text-paper-300">
                        <div className="relative">
                          <div className="h-16 w-16 rotate-12 rounded-2xl border border-paper-300 bg-gradient-to-br from-paper-200 to-paper-300" />
                        </div>
                      </div>}
                </div>
                {/* body */}
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-display text-lg text-paper-900">{p.title}</h3>
                    <p className="mt-0.5 text-2xs text-paper-500">by {p.authorName} · {TIME_AGO(p.createdAt)}</p>
                  </div>
                  {p.description && <p className="line-clamp-2 text-sm leading-relaxed text-paper-600">{p.description}</p>}
                  {p.tags && (
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map(t => <span key={t} className="chip">#{t}</span>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleLike(p.id)}
                        className={`btn-ghost ${p.liked ? 'text-rust' : ''}`}>
                        <Icon d={I.heart} /> {p.likes}
                      </button>
                      <button onClick={() => remix(p.id)} className="btn-ghost">
                        <Icon d={I.remix} /> {p.remixes}
                      </button>
                      <button className="btn-ghost"><Icon d={I.comment} /> {p.comments}</button>
                    </div>
                    <Link to={`/community/${p.id}`} className="text-2xs font-semibold text-paper-900 hover:text-blue">
                      Open →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && tab === 'mine' && sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-paper-300 bg-paper-50 p-10 text-center">
            <p className="font-display text-xl text-paper-900">No posts yet</p>
            <p className="mt-2 text-sm text-paper-600">Publish from any design's menu to share it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}