import { Link } from 'react-router-dom';

/* ─────────────────────────── decorative atoms ─────────────────────────── */

const Brand = ({ size = 28 }: { size?: number }) => (
  <div className="flex items-center gap-2.5">
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-md bg-blue/70" />
      <div className="absolute inset-[18%] rounded-sm bg-paper-50" />
    </div>
    <span className="font-display text-2xl text-paper-900">Boxy</span>
  </div>
);

// Ruler ticks running vertically — used as a left/right column edge like in Paper screenshots.
const RulerTicks = ({ side = 'right' as 'left' | 'right' }) => (
  <div className={`pointer-events-none absolute top-0 h-full w-[14px] ${side === 'right' ? 'right-0' : 'left-0'}`}>
    <div className="h-full w-full"
      style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.22) 0 1px, transparent 1px 8px, rgba(0,0,0,0.10) 8px 9px, transparent 9px 16px)',
      }} />
  </div>
);

// Architectural thin-line frame with corner ticks (the framed-canvas feel).
const Framed = ({ children, label }: { children: React.ReactNode; label?: string }) => (
  <div className="relative">
    <div className="absolute -inset-px rounded-xl border border-paper-300" />
    <span className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 bg-paper-50 outline outline-1 outline-paper-400" />
    <span className="absolute -right-[3px] -top-[3px] h-1.5 w-1.5 bg-paper-50 outline outline-1 outline-paper-400" />
    <span className="absolute -bottom-[3px] -left-[3px] h-1.5 w-1.5 bg-paper-50 outline outline-1 outline-paper-400" />
    <span className="absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 bg-paper-50 outline outline-1 outline-paper-400" />
    {label && (
      <span className="absolute -top-2.5 left-3 bg-paper-50 px-1.5 text-2xs uppercase tracking-wider text-paper-500">
        {label}
      </span>
    )}
    <div className="relative">{children}</div>
  </div>
);

// Soft washed-paper square — like the tape blocks in the screenshots.
const Swatch = ({
  c = '#8aa6ff', rot = 8, className = '',
}: { c?: string; rot?: number; className?: string }) => (
  <div
    className={`absolute h-20 w-24 rounded-sm shadow-card ${className}`}
    style={{
      background: c,
      transform: `rotate(${rot}deg)`,
      maskImage: 'radial-gradient(120% 100% at 30% 30%, black 60%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(120% 100% at 30% 30%, black 60%, transparent 100%)',
      opacity: 0.85,
    }}
  />
);

const SectionHead = ({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) => (
  <div className="max-w-2xl">
    <p className="text-xs uppercase tracking-[0.18em] text-paper-500">{kicker}</p>
    <h2 className="display mt-4 text-5xl leading-[1] text-paper-900">{title}</h2>
    {sub && <p className="mt-5 text-base leading-relaxed text-paper-600">{sub}</p>}
  </div>
);

/* ─────────────────────────── window mockups ─────────────────────────── */

const ConversationMockup = () => (
  <div className="window-frame">
    <div className="window-titlebar">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="ml-2 font-mono">boxy · conversation</span>
    </div>
    <div className="space-y-3 p-5 font-mono text-xs">
      <p className="text-paper-500">you</p>
      <p className="text-paper-900">a small enclosure for a 60×30mm PCB, snap-fit lid.</p>
      <p className="mt-4 text-paper-500">boxy <span className="text-paper-400">— planning</span></p>
      <ol className="space-y-1.5 text-paper-600">
        <li>1. base shell · 2mm walls</li>
        <li>2. lid with snap-fit lip</li>
        <li>3. pcb standoffs ×4 <span className="text-paper-400">(pattern)</span></li>
        <li>4. vent slots <span className="text-paper-400">(linear pattern)</span></li>
        <li>5. critique + fillet</li>
      </ol>
      <div className="mt-3 rounded-md border border-paper-300 bg-paper-100/70 px-2.5 py-1.5 text-2xs">
        <span className="text-olive">●</span> <span className="text-paper-600">looks clean. proceeding to step 2.</span>
      </div>
    </div>
  </div>
);

const DslMockup = () => (
  <div className="window-frame">
    <div className="window-titlebar">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="ml-2 font-mono">boxydsl · step 2 of 5</span>
    </div>
    <div className="font-mono text-2xs leading-[1.6]">
      {[
        ['sketch', 'lid_profile · 6 pts'],
        ['extrude', 'lid_profile → lid · 4mm'],
        ['roundedBox', 'snap_lip · 58×2×3'],
        ['boolean', 'union  lid ◦ snap_lip → lid'],
        ['fillet', 'lid · r1.2'],
        ['color', 'lid · #d8d2bf'],
      ].map(([k, v]) => (
        <div key={k as string} className="flex items-center gap-2 border-b border-paper-300/70 px-4 py-1.5 last:border-0">
          <span className="rounded bg-paper-200 px-1.5 py-0.5 font-semibold text-paper-900">{k}</span>
          <span className="truncate text-paper-600">{v}</span>
        </div>
      ))}
    </div>
  </div>
);

const McpMockup = () => (
  <div className="window-frame">
    <div className="window-titlebar">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="ml-2 font-mono">mcp · tools/list</span>
    </div>
    <div className="divide-y divide-paper-300/70 font-mono text-xs">
      {[
        ['design.list', 'core'],
        ['design.append_ops', 'core'],
        ['design.snapshot', 'core'],
        ['design.replace_ops', 'core'],
        ['example-units.estimate_pla_cost', 'addin'],
        ['example-units.estimate_volume', 'addin'],
      ].map(([n, src]) => (
        <div key={n as string} className="flex items-center justify-between px-4 py-2">
          <span className="text-paper-900">{n}</span>
          <span className="chip">{src}</span>
        </div>
      ))}
    </div>
  </div>
);

const CanvasMockup = () => (
  <div className="window-frame">
    <div className="window-titlebar">
      <span className="dot" /><span className="dot" /><span className="dot" />
      <span className="ml-2 font-mono">boxy · live preview</span>
    </div>
    <div className="grid-paper relative grid h-80 place-items-center">
      <div className="relative">
        <div className="h-36 w-36 rotate-12 rounded-3xl border border-paper-300 bg-gradient-to-br from-paper-200 to-paper-300 shadow-card" />
        <div className="absolute -right-3 -top-3 h-10 w-10 rotate-[-18deg] rounded-xl border border-paper-300 bg-paper-50 shadow-soft" />
      </div>
      <div className="absolute bottom-3 left-3 rounded-md border border-paper-300 bg-paper-50/95 px-2.5 py-1 font-mono text-2xs text-paper-600">
        extrude · sketch_01 · 12mm
      </div>
      <div className="absolute bottom-3 right-3 rounded-md border border-paper-300 bg-paper-50/95 px-2.5 py-1 font-mono text-2xs text-paper-600">
        bbox 84×42×26 mm
      </div>
    </div>
  </div>
);

/* ─────────────────────────── page ─────────────────────────── */

export default function Landing() {
  return (
    <div className="paper-bg h-full overflow-y-auto">
      <header className="sticky top-0 z-30 border-b border-paper-300/70 bg-paper-50/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-10 py-5">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm text-paper-600 md:flex">
            <a className="hover:text-paper-900" href="#how">how it works</a>
            <a className="hover:text-paper-900" href="#capabilities">capabilities</a>
            <a className="hover:text-paper-900" href="#mcp">addins & mcp</a>
            <a className="hover:text-paper-900" href="#faq">faq</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-paper-600 hover:text-paper-900">sign in</Link>
            <Link to="/login" className="btn-primary">get started →</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative">
        <RulerTicks side="right" />
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-10 pb-28 pt-24">
          <div className="col-span-12 md:col-span-7">
            <p className="text-xs uppercase tracking-[0.18em] text-paper-500">
              a connected canvas for 3D product design
            </p>
            <h1 className="display mt-6 text-[88px] leading-[0.95] text-paper-900">
              design real products,<br />
              <span className="italic text-paper-500">in conversation</span><br />
              with an agent.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-paper-600">
              Boxy is a CAD agent that <em>plans</em>, <em>builds</em>, and <em>rigs</em> 3D parts step
              by step — sketching, extruding, shelling, patterning, with self-critique
              between each major sub-assembly.
            </p>
            <div className="mt-9 flex items-center gap-3">
              <Link to="/login" className="btn-primary px-5 py-2.5 text-sm">start designing →</Link>
              <a href="#how" className="btn px-4 py-2.5 text-sm">see how it works</a>
            </div>
            <div className="mt-12 flex items-center gap-6 text-xs text-paper-500">
              <span>open alpha</span>
              <span className="h-px w-8 bg-paper-300" />
              <span>no card · 5 designs free</span>
              <span className="h-px w-8 bg-paper-300" />
              <span>MCP-native</span>
            </div>
          </div>

          <div className="relative col-span-12 md:col-span-5">
            <Swatch c="#8aa6ff" rot={6}  className="-top-6 right-10" />
            <Swatch c="#6b7d3f" rot={-9} className="bottom-12 -left-4" />
            <div className="relative z-10">
              <Framed label="canvas"><CanvasMockup /></Framed>
            </div>
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="border-y border-paper-300 bg-paper-100/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-10 py-7">
          <span className="text-2xs uppercase tracking-[0.2em] text-paper-500">
            built for makers shipping with agents
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-mono text-xs text-paper-500">
            <span>three.js</span>
            <span className="h-1 w-1 rounded-full bg-paper-300" />
            <span>three-bvh-csg</span>
            <span className="h-1 w-1 rounded-full bg-paper-300" />
            <span>OpenRouter</span>
            <span className="h-1 w-1 rounded-full bg-paper-300" />
            <span>MCP JSON-RPC</span>
            <span className="h-1 w-1 rounded-full bg-paper-300" />
            <span>STL · OBJ · GLB</span>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative">
        <RulerTicks side="left" />
        <div className="mx-auto max-w-7xl px-10 py-32">
          <SectionHead
            kicker="conversation first"
            title={<>describe it.<br /><span className="italic text-paper-500">Boxy plans the build.</span></>}
            sub="Tell Boxy what you want. It writes a 3–8 step plan, then assembles it one step at a time while you watch in 3D. Between major sub-assemblies, it critiques its own work against the snapshot and corrects mistakes."
          />

          <div className="mt-16 grid grid-cols-12 gap-6">
            {[
              ['01', 'you describe', <ConversationMockup key="cm" />, 'Plain English. The agent asks clarifying questions only when it really needs to.'],
              ['02', 'Boxy writes BoxyDSL', <DslMockup key="dm" />, 'A constrained tool-call language. Deterministic, replayable, exportable. No black-box mesh generation.'],
              ['03', 'you watch it build', <CanvasMockup key="cv" />, 'Live 3D preview. Bind keys to joints to actuate hinges and arms right on the canvas.'],
            ].map(([n, t, mock, desc]) => (
              <div key={n as string} className="col-span-12 md:col-span-4">
                <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-wider text-paper-500">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-paper-400 font-mono text-2xs text-paper-900">{n}</span>
                  {t}
                </div>
                <Framed>{mock}</Framed>
                <p className="mt-4 text-sm text-paper-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* anti-slop / critique */}
      <section className="relative border-y border-paper-300 bg-paper-100/40">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-10 py-32">
          <div className="col-span-12 md:col-span-6">
            <p className="text-xs uppercase tracking-[0.18em] text-paper-500">anti-slop</p>
            <h2 className="display mt-4 text-5xl leading-[1] text-paper-900">
              the agent <span className="italic text-paper-500">critiques</span> its own work.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-paper-600">
              Every few build steps, Boxy pauses, looks at the live render, and asks
              <em> "did I just do that right?"</em> — checking proportions, intersections,
              missing features from the plan. Then it emits deletes + redos before
              continuing. Less slop, more usable parts.
            </p>
            <ul className="mt-7 space-y-2.5 text-sm text-paper-600">
              <li className="flex gap-2.5"><span className="text-olive">▸</span> snapshot-grounded reasoning</li>
              <li className="flex gap-2.5"><span className="text-olive">▸</span> bounding-box sanity checks</li>
              <li className="flex gap-2.5"><span className="text-olive">▸</span> auto-fix loop: delete · redo · move on</li>
            </ul>
          </div>
          <div className="relative col-span-12 md:col-span-6">
            <Swatch c="#a8552c" rot={-6} className="-top-4 right-6" />
            <div className="relative z-10">
              <Framed label="critique pass">
                <div className="window-frame">
                  <div className="window-titlebar">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                    <span className="ml-2 font-mono">boxy · self-review · step 06</span>
                  </div>
                  <div className="space-y-3 p-5 text-xs font-mono">
                    <p className="text-paper-500">snapshot received · bbox 84×42×26 mm</p>
                    <div className="rounded-md border border-rust/30 bg-rust/5 p-3">
                      <p className="text-2xs uppercase tracking-wider text-rust">issues</p>
                      <ul className="mt-1.5 space-y-1 text-paper-900">
                        <li>· standoff_3 intersects with vent_slot_2</li>
                        <li>· lid lip is 1.4mm too short on -X side</li>
                      </ul>
                    </div>
                    <p className="text-paper-500">applying fixes…</p>
                    <div className="space-y-0.5 text-paper-900">
                      <p>delete · standoff_3</p>
                      <p>primitive · standoff_3 (at -22, 0, 0)</p>
                      <p>transform · lid · translate [1.4,0,0]</p>
                    </div>
                    <p className="text-olive">● looks clean. proceeding.</p>
                  </div>
                </div>
              </Framed>
            </div>
          </div>
        </div>
      </section>

      {/* capabilities grid */}
      <section id="capabilities" className="relative">
        <RulerTicks side="right" />
        <div className="mx-auto max-w-7xl px-10 py-32">
          <SectionHead
            kicker="real CAD primitives"
            title={<>not just booleans.<br /><span className="italic text-paper-500">a real toolkit.</span></>}
            sub="Sketch a 2D profile and extrude it. Shell a solid to a wall thickness. Pattern a feature radially around a hub. Rig parts to keys for live actuation."
          />

          <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-paper-300 bg-paper-300 md:grid-cols-3">
            {[
              ['sketch + extrude', 'Real 2D-to-3D, the way CAD actually works.', '◢'],
              ['shell', 'Hollow a solid to a uniform wall thickness — for housings.', '○'],
              ['linear & circular pattern', 'Repeat features along a line or around a hub.', '⋮⋮'],
              ['lathe / revolve', 'Mugs, bottles, knobs — anything axially symmetric.', '◐'],
              ['rig joints', 'Bind keys to rotate or translate parts on the canvas.', '⤿'],
              ['STL · OBJ · GLB', 'Export anywhere. Manufacture anywhere.', '↧'],
            ].map(([t, d, g]) => (
              <div key={t as string} className="group relative bg-paper-50 p-7 transition-colors hover:bg-paper-100">
                <div className="font-display text-3xl text-paper-300 transition-colors group-hover:text-blue/70">{g}</div>
                <div className="mt-4 font-display text-2xl text-paper-900">{t}</div>
                <p className="mt-2 text-sm leading-relaxed text-paper-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MCP / addins */}
      <section id="mcp" className="relative border-t border-paper-300 bg-paper-100/40">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-10 py-32">
          <div className="relative col-span-12 md:col-span-6 md:order-2">
            <Swatch c="#8aa6ff" rot={8} className="-top-6 -right-2" />
            <Swatch c="#6b7d3f" rot={-4} className="bottom-12 left-6 h-16 w-20" />
            <div className="relative z-10 space-y-4">
              <Framed label="mcp manifest"><McpMockup /></Framed>
              <div className="window-frame">
                <div className="window-titlebar">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                  <span className="ml-2 font-mono">addin · pla cost estimator</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-5 text-xs">
                  <div><p className="text-paper-500">volume</p><p className="mt-1 font-display text-xl text-paper-900">82 cm³</p></div>
                  <div><p className="text-paper-500">mass (20%)</p><p className="mt-1 font-display text-xl text-paper-900">20.3 g</p></div>
                  <div><p className="text-paper-500">cost</p><p className="mt-1 font-display text-xl text-paper-900">$0.45</p></div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 md:order-1">
            <p className="text-xs uppercase tracking-[0.18em] text-paper-500">extensible by design</p>
            <h2 className="display mt-4 text-5xl leading-[1] text-paper-900">
              connected to your tools,<br />
              <span className="italic text-paper-500">over MCP.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-paper-600">
              Boxy speaks JSON-RPC MCP out of the box. Drive your canvas from Claude
              Desktop or any client. Drop a folder into
              <code className="mx-1 rounded bg-paper-200 px-1.5 py-0.5 font-mono text-xs">server/addins/</code>
              to register your own tools — cost estimates, FEA hooks, BOMs — with optional iframe UI panels.
            </p>
            <div className="mt-7 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-lg border border-paper-300 bg-paper-50 p-3.5">
                <p className="text-2xs uppercase tracking-wider text-paper-500">tools/list</p>
                <p className="mt-1.5 font-display text-xl text-paper-900">6 core</p>
                <p className="text-xs text-paper-500">canvas, ops, snapshot</p>
              </div>
              <div className="rounded-lg border border-paper-300 bg-paper-50 p-3.5">
                <p className="text-2xs uppercase tracking-wider text-paper-500">addins</p>
                <p className="mt-1.5 font-display text-xl text-paper-900">unlimited</p>
                <p className="text-xs text-paper-500">tools + UI panels</p>
              </div>
            </div>
            <a href="#" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-paper-900 hover:text-blue">
              read the addin guide →
            </a>
          </div>
        </div>
      </section>

      {/* workflow strip */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-10 py-32">
          <SectionHead
            kicker="end to end"
            title={<>idea → CAD → STL,<br /><span className="italic text-paper-500">in one conversation.</span></>}
          />
          <div className="mt-14 grid grid-cols-12 gap-2 text-xs">
            {[
              ['describe', 'plain English'],
              ['plan',     '3–8 steps'],
              ['build',    'BoxyDSL · CSG'],
              ['critique', 'snapshot review'],
              ['rig',      'keys → joints'],
              ['export',   'STL · OBJ · GLB'],
            ].map(([label, sub], i) => (
              <div key={i} className="col-span-6 md:col-span-2">
                <div className="flex items-center gap-2 border-l border-paper-300 px-3 py-1">
                  <span className="font-mono text-paper-400">0{i + 1}</span>
                </div>
                <div className="mt-3 px-3">
                  <p className="font-display text-2xl text-paper-900">{label}</p>
                  <p className="mt-1 text-paper-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* quotes */}
      <section className="border-y border-paper-300 bg-paper-100/40">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-10 py-24">
          {[
            ['"Finally, AI that doesn\'t just give me a mesh blob — it gives me a part I can actually make."', '— a maker, somewhere'],
            ['"The critique step alone saved me three back-and-forths."', '— industrial designer'],
            ['"I wired up an addin in 20 minutes that costs every part I draft. Wild."', '— hardware founder'],
          ].map(([q, who], i) => (
            <figure key={i} className="col-span-12 md:col-span-4">
              <blockquote className="display text-2xl leading-[1.15] text-paper-900">{q}</blockquote>
              <figcaption className="mt-4 text-xs uppercase tracking-wider text-paper-500">{who}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="relative">
        <RulerTicks side="left" />
        <div className="mx-auto max-w-3xl px-10 py-32">
          <SectionHead kicker="questions" title={<>the obvious ones,<br /><span className="italic text-paper-500">answered.</span></>} />
          <div className="mt-12 divide-y divide-paper-300 border-y border-paper-300">
            {[
              ['Is Boxy real CAD or just a mesh?', "Both, depending on the op. It runs on three.js + boolean CSG (mesh), with sketch+extrude, shell, pattern, lathe, and joint rigging. True B-rep edge fillets need OpenCascade — that's a future swap."],
              ['How does the agent avoid generating slop?', 'Every few build steps the agent renders the current state, gets the snapshot + bounding box back, and explicitly critiques it — looking for intersections, wrong proportions, missing plan items — then emits delete + redo ops before continuing.'],
              ['Can I drive Boxy from Claude Desktop?', 'Yes. Boxy is an MCP server at /mcp/v1/rpc. Generate an API key from the Addins page and point any MCP client at it. Six core tools, more via addins.'],
              ['What do I export?', 'STL, OBJ, and GLB. FBX is intentionally not included — three.js has no native FBX exporter.'],
              ['What models does it run on?', 'Anything OpenRouter exposes — set LLM_MODEL in .env. Strong reasoning models give noticeably better critique and spatial accuracy.'],
              ["Where's my data?", 'A local JSON file (server/db/boxy.json). No Supabase, no native DB. Your OpenRouter key never leaves the server.'],
            ].map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-none items-center justify-between font-display text-2xl text-paper-900 marker:hidden">
                  <span>{q}</span>
                  <span className="text-paper-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-paper-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className="relative overflow-hidden border-t border-paper-300">
        <div className="absolute inset-0 grid-paper opacity-60" />
        <Swatch c="#8aa6ff" rot={10}  className="left-[12%] top-12" />
        <Swatch c="#6b7d3f" rot={-12} className="right-[18%] bottom-14" />
        <div className="relative mx-auto max-w-3xl px-10 py-32 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-paper-500">your first design is free</p>
          <h2 className="display mt-6 text-7xl leading-[0.95] text-paper-900">
            stop typing prompts.<br />
            <span className="italic text-paper-500">start designing.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base text-paper-600">
            Conversational CAD that you can actually manufacture. Open alpha, free to try.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link to="/login" className="btn-primary px-5 py-2.5 text-sm">start designing →</Link>
            <a href="#how" className="btn px-4 py-2.5 text-sm">scroll up to learn more</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-paper-300 bg-paper-100/60">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-10 py-12">
          <div className="col-span-12 md:col-span-4">
            <Brand size={22} />
            <p className="mt-3 max-w-xs text-xs text-paper-500">
              Conversational CAD for makers and teams shipping with agents.
            </p>
          </div>
          <div className="col-span-6 md:col-span-2">
            <p className="text-2xs uppercase tracking-wider text-paper-500">product</p>
            <ul className="mt-3 space-y-1.5 text-sm text-paper-600">
              <li><a href="#how" className="hover:text-paper-900">how it works</a></li>
              <li><a href="#capabilities" className="hover:text-paper-900">capabilities</a></li>
              <li><a href="#mcp" className="hover:text-paper-900">mcp & addins</a></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <p className="text-2xs uppercase tracking-wider text-paper-500">resources</p>
            <ul className="mt-3 space-y-1.5 text-sm text-paper-600">
              <li><a href="#" className="hover:text-paper-900">docs</a></li>
              <li><a href="#" className="hover:text-paper-900">changelog</a></li>
              <li><a href="#faq" className="hover:text-paper-900">faq</a></li>
            </ul>
          </div>
          <div className="col-span-12 flex items-end md:col-span-4 md:justify-end">
            <p className="text-2xs text-paper-500">© 2026 · boxy · an open alpha</p>
          </div>
        </div>
      </footer>
    </div>
  );
}