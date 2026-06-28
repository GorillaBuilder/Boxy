import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AgentResponse, BoxyOp } from '../engine/types';
import type { ViewerHandle } from '../components/Viewer';

export interface ChatItem {
  role: 'user' | 'assistant';
  text: string;
  plan?: string[];
  ops?: OpLog[];
  critique?: { issues: string[] };
  streaming?: boolean;
  attachment?: string;
}

export interface OpLog { label: string; detail: string; }

const summarize = (op: BoxyOp): OpLog => {
  switch (op.op) {
    case 'primitive': return { label: op.shape, detail: op.id };
    case 'sketch':    return { label: 'sketch',    detail: `${op.id} · ${op.points.length} pts` };
    case 'extrude':   return { label: 'extrude',   detail: `${op.sketch} → ${op.id} (${op.depth}mm)` };
    case 'shell':     return { label: 'shell',     detail: `${op.target} t${op.thickness}mm → ${op.id}` };
    case 'pattern':   return { label: `pattern·${op.kind}`, detail: `${op.target} ×${op.count} → ${op.id}` };
    case 'boolean':   return { label: op.action,   detail: `${op.a} ◦ ${op.b} → ${op.id}` };
    case 'transform': return { label: 'transform', detail: op.id };
    case 'fillet':    return { label: 'fillet',    detail: `${op.id} r${op.radius}` };
    case 'color':     return { label: 'color',     detail: `${op.id} ${op.hex}` };
    case 'delete':    return { label: 'delete',    detail: op.id };
    case 'group':     return { label: 'group',     detail: op.name || op.id };
    case 'hinge':     return { label: 'hinge',     detail: `${op.parent}.${op.parentFace} ↔ ${op.child} · key "${op.key}"` };
    case 'slider':    return { label: 'slider',    detail: `${op.parent}.${op.parentFace} ↔ ${op.child} · key "${op.key}"` };
    case 'chain':     return { label: 'chain',     detail: `${op.links.join(' → ')} · keys ${op.keys.join(',')}` };
    case 'joint':     return { label: 'joint',     detail: `${op.target} · key "${op.key}" (legacy)` };
    default:          return { label: (op as any).op, detail: '' };
  }
};

export function useAgent(designId: string, viewer: React.RefObject<ViewerHandle>) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [ops, setOps] = useState<BoxyOp[]>([]);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const history = useRef<{ role: string; content: any }[]>([]);
  const opsRef = useRef<BoxyOp[]>([]);

  const persist = useCallback((nextOps: BoxyOp[]) => {
    const thumb = viewer.current?.snapshot?.();
    api.patchDesign(designId, { dsl: nextOps, thumbnail: thumb });
  }, [designId, viewer]);

  const streamSay = useCallback((text: string, opLogs: OpLog[], plan?: string[], critique?: any) =>
    new Promise<void>((resolve) => {
      let i = 0;
      setMessages(m => [...m, { role: 'assistant', text: '', plan, ops: opLogs, critique, streaming: true }]);
      const tick = () => {
        i += Math.max(1, Math.round(text.length / 40));
        const slice = text.slice(0, i);
        setMessages(m => {
          const c = [...m]; const last = c[c.length - 1];
          if (last?.streaming) c[c.length - 1] = { ...last, text: slice };
          return c;
        });
        if (i < text.length) setTimeout(tick, 16);
        else {
          setMessages(m => {
            const c = [...m]; const last = c[c.length - 1];
            if (last?.streaming) c[c.length - 1] = { ...last, text, streaming: false };
            return c;
          });
          resolve();
        }
      };
      tick();
    }), []);

  const applyResponse = useCallback(async (r: AgentResponse) => {
    const buildOps = (r.ops && r.ops.length) ? r.ops : [];
    const opLogs = buildOps.map(summarize);
    history.current.push({ role: 'assistant', content: r });
    await streamSay(r.say || (opLogs.length ? 'Building…' : ''), opLogs, r.plan, r.critique);
    if (buildOps.length) {
      const next = [...opsRef.current, ...buildOps];
      opsRef.current = next; setOps(next);
      setTimeout(() => persist(next), 400);
    }
  }, [persist, streamSay]);

  const buildLoop = useCallback(async () => {
    let safety = 14;
    let stepsSinceCritique = 0;
    while (safety-- > 0) {
      setStatus('rendering preview');
      await new Promise(r => setTimeout(r, 450));
      const snapshot = viewer.current?.snapshot?.();
      const bbox = viewer.current?.bbox?.();
      const doCritique = stepsSinceCritique >= 3;
      setStatus(doCritique ? 'critiquing the current build' : 'reasoning about the next step');
      const r: AgentResponse = await api.agent({
        designId, history: history.current,
        ...(doCritique ? { critique: true } : { proceed: true }),
        snapshot, bbox,
      });
      stepsSinceCritique = doCritique ? 0 : stepsSinceCritique + 1;
      await applyResponse(r);
      if (!(r.ops && r.ops.length) && r.mode !== 'critique') break;
    }
    setStatus('');
  }, [designId, applyResponse, viewer]);

  const send = useCallback(async (text: string, attachedSnapshot?: string) => {
    setMessages(m => [...m, { role: 'user', text, attachment: attachedSnapshot }]);
    history.current.push({ role: 'user', content: text });
    setThinking(true); setStatus('planning the build');
    try {
      const r: AgentResponse = await api.agent({
        designId, history: history.current, userText: text,
        ...(attachedSnapshot ? { snapshot: attachedSnapshot } : {}),
      });
      await applyResponse(r);
      if (r.mode === 'plan') { setStatus('building'); await buildLoop(); }
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Error: ' + String((e as Error).message) }]);
    } finally {
      setThinking(false); setStatus('');
    }
  }, [designId, applyResponse, buildLoop]);

  const hydrate = useCallback((savedOps: BoxyOp[], savedMsgs: ChatItem[], rawHistory: any[]) => {
    opsRef.current = savedOps; setOps(savedOps);
    setMessages(savedMsgs);
    history.current = rawHistory;
  }, []);

  useEffect(() => {
    if (thinking) return;
    const i = setInterval(async () => {
      try {
        const { design } = await api.getDesign(designId);
        const fresh = JSON.parse(design.dsl || '[]');
        if (fresh.length !== opsRef.current.length) {
          opsRef.current = fresh; setOps(fresh);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(i);
  }, [designId, thinking]);

  return { messages, ops, thinking, status, send, hydrate };
}