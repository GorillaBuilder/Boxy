import { useEffect, useRef } from 'react';

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.style.transform = 'translate(-100px, -100px)';
    let raf = 0, x = -100, y = -100, tx = -100, ty = -100, ready = false;
    const move = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY;
      if (!ready) { ready = true; x = tx; y = ty; el.classList.add('ready'); }
      const t = e.target as HTMLElement;
      const interactive = t.closest('button, a, [role="button"], .btn, .btn-primary, .btn-ghost, input, textarea');
      el.classList.toggle('hot', !!t.closest('button, a, [role="button"], .btn, .btn-primary, .btn-ghost'));
      el.classList.toggle('text', !!t.closest('input, textarea'));
      if (!interactive) el.classList.remove('text');
    };
    const leave = () => el.classList.remove('ready');
    const enter = () => { if (ready) el.classList.add('ready'); };
    const loop = () => {
      x += (tx - x) * 0.25; y += (ty - y) * 0.25;
      el.style.transform = `translate(${x}px, ${y}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className="boxy-cursor">
      <div className="ring" />
      <div className="dot" />
    </div>
  );
}
