import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Section { id: string; title: string; kicker: string; }

const SECTIONS: Section[] = [
  { id: 'intro',          kicker: 'start here',  title: 'Introduction' },
  { id: 'quickstart',     kicker: 'getting set', title: 'Quickstart' },
  { id: 'concepts',       kicker: 'mental model',title: 'Core concepts' },
  { id: 'boxydsl',        kicker: 'the language',title: 'BoxyDSL reference' },
  { id: 'rigging',        kicker: 'articulation',title: 'Rigging & joints' },
  { id: 'agent',          kicker: 'how it thinks',title: 'How the agent works' },
  { id: 'mcp',            kicker: 'integrations',title: 'MCP server' },
  { id: 'addins',         kicker: 'extending',   title: 'Writing addins' },
  { id: 'export',         kicker: 'shipping',    title: 'Export formats' },
  { id: 'troubleshooting',kicker: 'when stuck',  title: 'Troubleshooting' },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-lg border border-paper-300 bg-paper-100 p-3 font-mono text-xs leading-relaxed text-paper-900">
      <code>{children}</code>
    </pre>
  );
}

function OpCard({ name, sig, blurb }: { name: string; sig: string; blurb: string }) {
  return (
    <div className="rounded-lg border border-paper-300 bg-paper-50 p-3.5">
      <div className="flex items-baseline gap-2.5">
        <span className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-2xs font-semibold text-paper-900">{name}</span>
        <span className="font-mono text-2xs text-paper-500">{sig}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-paper-600">{blurb}</p>
    </div>
  );
}

export default function Docs() {
  const [active, setActive] = useState('intro');

  // Spy on scroll to highlight current section in the sidebar.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="paper-bg h-screen overflow-y-auto">
      <header className="sticky top-0 z-30 border-b border-paper-300/70 bg-paper-50/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative h-7 w-7">
              <div className="absolute inset-0 rounded-md bg-blue/70" />
              <div className="absolute inset-[18%] rounded-sm bg-paper-50" />
            </div>
            <span className="font-display text-xl text-paper-900">Boxy</span>
            <span className="ml-2 rounded-md border border-paper-300 px-2 py-0.5 text-2xs uppercase tracking-wider text-paper-500">docs</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-paper-600 hover:text-paper-900">home</Link>
            <Link to="/dashboard" className="btn-primary text-sm">open app →</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-12 gap-10 px-8 py-12">
        {/* sidebar */}
        <aside className="sticky top-20 col-span-12 self-start md:col-span-3">
          <p className="mb-3 text-2xs uppercase tracking-[0.18em] text-paper-500">on this page</p>
          <nav className="space-y-0.5">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`}
                className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors
                  ${active === s.id ? 'bg-paper-200 text-paper-900' : 'text-paper-600 hover:bg-paper-200/60 hover:text-paper-900'}`}>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* content */}
        <article className="col-span-12 max-w-2xl space-y-20 md:col-span-9">
          {/* intro */}
          <section id="intro" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">start here</p>
            <h1 className="display mt-3 text-5xl leading-[1.05] text-paper-900">Introduction</h1>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              Boxy is a conversational CAD agent. You describe a product in plain English,
              Boxy plans a build, then assembles it step by step — sketching, extruding,
              shelling, patterning, rigging — while you watch in 3D and steer mid-build.
            </p>
            <p className="mt-3 text-base leading-relaxed text-paper-600">
              Under the hood it's three things: a constrained <em>tool-call language</em> the
              agent emits (BoxyDSL), a deterministic <em>geometry kernel</em> that executes
              it on three.js + CSG, and a <em>self-critique loop</em> where the agent reads
              its own render snapshot and corrects mistakes before continuing.
            </p>
          </section>

          {/* quickstart */}
          <section id="quickstart" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">getting set</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">Quickstart</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              Two commands, two terminals. Boxy uses a Vite + React client and a Node/Express server.
            </p>
            <Code>{`# 1. install
cd server && npm install
cd ../client && npm install

# 2. configure
cp server/.env.example server/.env
# fill OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID/SECRET

# 3. run (two terminals)
cd server && npm run dev   # :8787 — API + MCP
cd client && npm run dev   # :5173 — open this in your browser`}</Code>
            <p className="mt-3 text-sm text-paper-600">
              Sign in with Google, click <em>new design</em>, type what you want to build.
            </p>
          </section>

          {/* concepts */}
          <section id="concepts" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">mental model</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">Core concepts</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              Three ideas worth holding in your head while using Boxy.
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
                <h3 className="font-display text-xl text-paper-900">1. The agent doesn't draw — it programs.</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-600">
                  Every part you see is the result of a deterministic op (primitive, sketch,
                  extrude, boolean, hinge…). You can read the program, replay it, export the
                  meshes, or edit ops by hand in the JSON store.
                </p>
              </div>
              <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
                <h3 className="font-display text-xl text-paper-900">2. Coordinates are in millimetres, +Y is up.</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-600">
                  Real-world units make manufacturing sane. A baseplate at <code className="rounded bg-paper-200 px-1 font-mono text-xs">size:[100,6,80]</code> is 100mm × 6mm × 80mm.
                </p>
              </div>
              <div className="rounded-xl border border-paper-300 bg-paper-50 p-5">
                <h3 className="font-display text-xl text-paper-900">3. Build outward from an anchor.</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-600">
                  Place the largest/central part first. For everything else, prefer ops like
                  <code className="rounded bg-paper-200 px-1 font-mono text-xs"> hinge</code> that attach by <em>face</em>, not by raw coordinates.
                  This is how chained motion works without drift.
                </p>
              </div>
            </div>
          </section>

          {/* boxydsl */}
          <section id="boxydsl" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">the language</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">BoxyDSL reference</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              A program is an array of ops. Each op has an <code className="rounded bg-paper-200 px-1 font-mono text-xs">op</code> field
              and an <code className="rounded bg-paper-200 px-1 font-mono text-xs">id</code> that subsequent ops can reference.
            </p>

            <h3 className="mt-8 font-display text-2xl text-paper-900">Primitives</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <OpCard name="primitive" sig="shape: box | roundedBox" blurb="Rectangular volumes. Use roundedBox for housings — every real product has radii." />
              <OpCard name="primitive" sig="shape: cylinder | cone" blurb="Round solids with axis x/y/z. Defaults to y." />
              <OpCard name="primitive" sig="shape: sphere | torus | capsule" blurb="Curved organic forms." />
              <OpCard name="primitive" sig="shape: lathe (profile)" blurb="Revolve a 2D profile around the Y axis. Mugs, bottles, knobs." />
            </div>

            <h3 className="mt-8 font-display text-2xl text-paper-900">Sketch + extrude</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">
              For non-trivial cross-sections. A <code className="rounded bg-paper-200 px-1 font-mono text-xs">sketch</code> defines a closed 2D profile; <code className="rounded bg-paper-200 px-1 font-mono text-xs">extrude</code> turns it 3D.
            </p>
            <Code>{`{ "op":"sketch",  "id":"profile", "points":[[0,0],[60,0],[60,20],[30,30],[0,20]] }
{ "op":"extrude", "id":"bracket", "sketch":"profile", "depth":12, "bevel":1 }`}</Code>

            <h3 className="mt-8 font-display text-2xl text-paper-900">CAD operations</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <OpCard name="shell" sig="target, thickness" blurb="Hollow a solid to a uniform wall thickness. Housings, mugs." />
              <OpCard name="pattern" sig="kind: linear | circular" blurb="Repeat a feature along a line or around an axis. Vents, holes, bolts." />
              <OpCard name="boolean" sig="union | subtract | intersect" blurb="CSG between two parts. Consumes inputs — don't reference them after." />
              <OpCard name="transform" sig="translate, rotate, scale" blurb="Move, rotate, or scale a part. Rotation in degrees." />
              <OpCard name="fillet" sig="radius" blurb="Soften edges. Currently visual rather than true B-rep." />
              <OpCard name="color" sig="hex" blurb='Set material color. e.g. "#c8492e".' />
              <OpCard name="delete" sig="id" blurb="Remove a part from the scene. Useful after critique." />
              <OpCard name="group" sig="members, name" blurb="Logical grouping for rigging targets." />
            </div>
          </section>

          {/* rigging */}
          <section id="rigging" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">articulation</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">Rigging &amp; joints</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              For anything that moves — hinges, drawers, robotic arms — use <em>face-based</em> rig ops.
              They snap parts together by named bounding-box face and compute pivots dynamically
              from each part's current world transform, so chains stay connected.
            </p>

            <h3 className="mt-8 font-display text-2xl text-paper-900">hinge</h3>
            <Code>{`{ "op":"hinge", "id":"lid_hinge",
  "parent":"body", "child":"lid",
  "parentFace":"+y", "childFace":"-y",
  "axis":"x", "min":-90, "max":0,
  "key":"r", "name":"Lid" }`}</Code>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">
              Faces are <code className="font-mono text-xs">+x|-x|+y|-y|+z|-z|center</code>. <code className="font-mono text-xs">childFace</code> defaults to the opposite of <code className="font-mono text-xs">parentFace</code>.
            </p>

            <h3 className="mt-8 font-display text-2xl text-paper-900">chain</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">
              For articulated kinematics — lamp arms, robot fingers, foldable assemblies.
              Each consecutive pair of links is connected by an automatic hinge.
            </p>
            <Code>{`{ "op":"chain", "id":"arm",
  "links":["lower_arm","upper_arm","head"],
  "axis":"y", "keys":["q","w"], "range":[-90,90] }`}</Code>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">
              Pressing <kbd className="rounded bg-paper-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper-900">q</kbd> rotates
              <code className="mx-1 font-mono text-xs">upper_arm</code> and everything downstream around the shoulder joint.
              <kbd className="ml-1.5 rounded bg-paper-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper-900">w</kbd> rotates only
              <code className="mx-1 font-mono text-xs">head</code> around the elbow. Hold <kbd className="mx-1 rounded bg-paper-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-paper-900">shift</kbd> to reverse.
            </p>

            <h3 className="mt-8 font-display text-2xl text-paper-900">slider</h3>
            <Code>{`{ "op":"slider", "id":"drawer",
  "parent":"cabinet", "child":"drawer_box",
  "parentFace":"+z", "axis":"z",
  "min":0, "max":80, "key":"d" }`}</Code>
          </section>

          {/* agent */}
          <section id="agent" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">how it thinks</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">How the agent works</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              Three modes: <em>plan</em>, <em>build</em>, <em>critique</em>. The agent writes a numbered plan
              first, then loops one build step at a time. Every few steps it gets a snapshot of
              the current render back and explicitly self-critiques — flagging intersections,
              wrong proportions, missing plan items — and emits <code className="font-mono text-xs">delete</code> + redo ops to fix.
            </p>
            <div className="mt-6 rounded-lg border border-rust/30 bg-rust/5 p-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-rust">honest caveat</p>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-900">
                Even a strong model will produce noisy results without good scene context.
                Boxy passes the build history and the latest render snapshot. For complex
                products, the agent benefits from frontier-tier vision models — see <a href="#troubleshooting" className="underline">troubleshooting</a>.
              </p>
            </div>
          </section>

          {/* mcp */}
          <section id="mcp" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">integrations</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">MCP server</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              Boxy exposes a JSON-RPC <a href="https://modelcontextprotocol.io" className="underline">MCP</a> server. Any compatible client (Claude Desktop, your own
              agents) can drive Boxy designs over a single key.
            </p>
            <Code>{`POST /mcp/v1/rpc
x-boxy-key: bxy_xxx
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/list"}`}</Code>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">
              Core tools: <code className="font-mono text-xs">design.list</code>, <code className="font-mono text-xs">design.get</code>, <code className="font-mono text-xs">design.create</code>,
              <code className="mx-1 font-mono text-xs">design.append_ops</code>, <code className="font-mono text-xs">design.replace_ops</code>, <code className="font-mono text-xs">design.snapshot</code>.
              Addins register more.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">Generate a key on the <Link to="/addins" className="underline">Addins page</Link>.</p>
          </section>

          {/* addins */}
          <section id="addins" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">extending</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">Writing addins</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              An addin is a folder in <code className="font-mono text-xs">server/addins/&lt;id&gt;/</code> exporting a default object.
              Tools are registered as <code className="font-mono text-xs">&lt;id&gt;.&lt;toolname&gt;</code> on the MCP server. An optional
              iframe panel can render inside the design canvas.
            </p>
            <Code>{`// server/addins/my-addin/index.js
export default {
  id: 'my-addin',
  name: 'My Addin',
  panel: { url: '/addins/my-addin/panel.html', title: 'Panel' },
  tools: [
    {
      name: 'estimate_cost',
      description: 'Rough PLA cost from current volume',
      input: { type:'object', properties:{ volume_cm3:{type:'number'} } },
      run: async ({ userId, params }) => ({ usd: params.volume_cm3 * 0.022 }),
    },
  ],
};`}</Code>
            <p className="mt-3 text-sm leading-relaxed text-paper-600">
              Restart the server to load. Panels can <code className="font-mono text-xs">parent.postMessage(&#123;boxy_call, tool, args&#125;)</code> and the host responds with a result.
            </p>
          </section>

          {/* export */}
          <section id="export" className="scroll-mt-24">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">shipping</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">Export formats</h2>
            <p className="mt-5 text-base leading-relaxed text-paper-600">
              From the canvas toolbar: <strong>STL</strong>, <strong>OBJ</strong>, <strong>GLB</strong>.
              STL is the standard for 3D printing; OBJ is a portable triangle mesh; GLB embeds
              materials + scene structure for AR/web viewers.
            </p>
            <p className="mt-3 text-sm text-paper-500">FBX is intentionally not included — three.js has no native FBX exporter.</p>
          </section>

          {/* troubleshooting */}
          <section id="troubleshooting" className="scroll-mt-24 pb-16">
            <p className="text-2xs uppercase tracking-[0.18em] text-paper-500">when stuck</p>
            <h2 className="display mt-3 text-4xl leading-[1.1] text-paper-900">Troubleshooting</h2>

            <div className="mt-6 divide-y divide-paper-300 border-y border-paper-300">
              {[
                ['Canvas is empty after the agent ran.', 'A shell or boolean likely referenced a part that didn\'t exist yet. Open the browser console and look for "op failed" warnings — they name the bad op. The Design page also shows a "no geometry yet" diagnostic in that case.'],
                ['The agent produces 20+ ops of slabs.', 'The model is guessing coordinates because it has no structured scene state. Switch LLM_MODEL to a frontier vision model (anthropic/claude-opus-4-8 or google/gemini-2.5-pro). For complex products, also prefer hinge/chain ops over raw transforms.'],
                ['Joints don\'t respond to keys.', 'Click the 3D canvas first to give it keyboard focus. The rig HUD at the bottom of the canvas shows live angles when a joint moves. Shift+key reverses direction.'],
                ['Chain rotation looks disjointed.', 'You\'re likely using the legacy raw "joint" op with static pivots. Switch to "hinge" and "chain" — they compute pivots dynamically.'],
                ['Google sign-in loops back to /login.', 'On Codespaces, set OAUTH_BASE in server/.env to your forwarded :5173 host, and add that host\'s /api/auth/google/callback as an authorised redirect in Google Cloud Console.'],
              ].map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-none items-center justify-between text-sm font-semibold text-paper-900 marker:hidden">
                    <span>{q}</span>
                    <span className="text-paper-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-paper-600">{a}</p>
                </details>
              ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}