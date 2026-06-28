import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface Props { url: string; }

// Hosts an addin's iframe panel. The panel can postMessage({ boxy_call, tool, args })
// and we'll forward it to /api/addins/call (server-side, authenticated), returning the result.
export default function AddinPanel({ url }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      const msg = e.data;
      if (!msg?.boxy_call || !msg?.tool) return;
      try {
        const result = await api.callAddinTool(msg.tool, msg.args || {});
        ref.current?.contentWindow?.postMessage({ boxy_reply: msg.boxy_call, result }, '*');
      } catch (err) {
        ref.current?.contentWindow?.postMessage({ boxy_reply: msg.boxy_call, result: { error: String((err as Error).message) } }, '*');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <iframe
      ref={ref}
      src={url}
      className="h-full w-full border-0"
      sandbox="allow-scripts"
      title="addin panel"
    />
  );
}
