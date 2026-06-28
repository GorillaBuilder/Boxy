import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function AuthCallback() {
  const nav = useNavigate();
  const refresh = useAuth(s => s.refresh);
  useEffect(() => {
    (async () => {
      await refresh();
      const user = useAuth.getState().user;
      nav(user ? '/dashboard' : '/login?error=auth', { replace: true });
    })();
  }, [refresh, nav]);
  return <div className="grid h-full place-items-center text-xs text-paper-500">Signing you in…</div>;
}
