import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Cursor from './components/Cursor';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Design from './pages/Design';
import Addins from './pages/Addins';
import Docs from './pages/Docs';
import Community from './pages/Community';
import Profile from './pages/Profile';
import { useAuth } from './store/auth';

function Shell() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('boxy:sidebar') === 'collapsed'; } catch { return false; }
  });
  const toggle = () => setCollapsed(c => {
    const next = !c;
    try { localStorage.setItem('boxy:sidebar', next ? 'collapsed' : 'open'); } catch {}
    return next;
  });

  if (loading) return <div className="grid h-full place-items-center text-xs text-paper-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function Public({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-full place-items-center text-xs text-paper-500">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const refresh = useAuth(s => s.refresh);
  useEffect(() => {
    refresh();
    // Re-check auth after returning from Supabase OAuth — Supabase appends tokens to URL hash.
    const onHash = () => { if (window.location.hash.includes('access_token')) refresh(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [refresh]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Cursor />
      <Routes>
        <Route path="/" element={<Public><Landing /></Public>} />
        <Route path="/login" element={<Public><Login /></Public>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* public docs — accessible without sign-in */}
        <Route path="/docs" element={<Docs />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/addins" element={<Addins />} />
          <Route path="/community" element={<Community />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/design/:id" element={<Design />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}