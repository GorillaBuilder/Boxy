import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

function Icon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}
const I = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  out:  'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  trash:'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  layers:'M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5',
  plug: 'M9 7V3M15 7V3M7 11h10v3a5 5 0 01-10 0v-3zM12 19v3',
  chevL:'M15 18l-6-6 6-6',
  chevR:'M9 18l6-6-6-6',
};

interface Props { collapsed?: boolean; onToggle?: () => void; }

export default function Sidebar({ collapsed = false, onToggle }: Props) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, model, logout } = useAuth();
  const [designs, setDesigns] = useState<any[]>([]);

  const load = () => api.listDesigns().then(setDesigns).catch(() => {});
  useEffect(() => { load(); }, [loc.pathname]);

  const del = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    api.deleteDesign(id).then(() => {
      load();
      if (loc.pathname === `/design/${id}`) nav('/dashboard');
    });
  };

  const NavLink = ({ to, label, icon }: { to: string; label: string; icon: string }) => {
    const active = loc.pathname === to;
    return (
      <Link to={to} title={collapsed ? label : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'} text-sm font-medium transition-colors duration-150
          ${active ? 'bg-paper-200 text-paper-900' : 'text-paper-600 hover:bg-paper-200/60 hover:text-paper-900'}`}>
        <Icon d={icon} /> {!collapsed && label}
      </Link>
    );
  };

  return (
    <aside className={`flex h-full ${collapsed ? 'w-[58px]' : 'w-[252px]'} shrink-0 flex-col border-r border-paper-300 bg-paper-100 transition-[width] duration-200 ease-paper`}>
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-4`}>
        <Link to="/dashboard" className="flex items-center gap-2.5" title={collapsed ? 'Boxy' : undefined}>
          <div className="relative h-7 w-7">
            <div className="absolute inset-0 rounded-md bg-blue/70" />
            <div className="absolute inset-[18%] rounded-sm bg-paper-50" />
          </div>
          {!collapsed && <span className="font-display text-xl text-paper-900">Boxy</span>}
        </Link>
        {!collapsed && onToggle && (
          <button onClick={onToggle} title="Collapse sidebar"
            className="grid h-7 w-7 place-items-center rounded-md text-paper-500 transition-colors hover:bg-paper-200 hover:text-paper-900">
            <Icon d={I.chevL} size={14} />
          </button>
        )}
      </div>

      {collapsed && onToggle && (
        <div className="mb-1 flex justify-center">
          <button onClick={onToggle} title="Expand sidebar"
            className="grid h-7 w-7 place-items-center rounded-md text-paper-500 transition-colors hover:bg-paper-200 hover:text-paper-900">
            <Icon d={I.chevR} size={14} />
          </button>
        </div>
      )}

      <nav className={`space-y-0.5 ${collapsed ? 'px-2' : 'px-2.5'} pt-1`}>
        <NavLink to="/dashboard" label="Home" icon={I.home} />
        <NavLink to="/addins" label="Addins" icon={I.plug} />
      </nav>

      {!collapsed && (
        <div className="mt-6 flex items-center justify-between px-4">
          <span className="text-2xs font-semibold uppercase tracking-wider text-paper-500">Designs</span>
          <span className="text-2xs text-paper-500">{designs.length}</span>
        </div>
      )}
      {collapsed && <div className="mx-3 my-4 h-px bg-paper-300" />}

      <div className={`${collapsed ? 'mt-0 px-2' : 'mt-1.5 px-2.5'} flex-1 space-y-0.5 overflow-y-auto pb-3`}>
        {!collapsed && designs.length === 0 && (
          <p className="px-2.5 py-2 text-xs leading-relaxed text-paper-500">
            No designs yet. Start one from Home.
          </p>
        )}
        {designs.map((d) => {
          const active = loc.pathname === `/design/${d.id}`;
          return (
            <Link key={d.id} to={`/design/${d.id}`} title={collapsed ? d.title : undefined}
              className={`group flex w-full items-center gap-2.5 rounded-lg ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'} text-sm transition-colors duration-150
                ${active ? 'bg-paper-200 text-paper-900' : 'text-paper-600 hover:bg-paper-200/60 hover:text-paper-900'}`}>
              <Icon d={I.layers} size={14} />
              {!collapsed && <span className="min-w-0 flex-1 truncate">{d.title}</span>}
              {!collapsed && (
                <button onClick={(e) => del(e, d.id)}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-paper-500 opacity-0 transition-all duration-150 hover:bg-paper-300 hover:text-paper-900 group-hover:opacity-100"
                  title="Delete">
                  <Icon d={I.trash} size={13} />
                </button>
              )}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-paper-300 p-2.5">
        <div className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 ${collapsed ? 'flex-col gap-2 px-0' : ''}`}>
          {user?.avatar
            ? <img src={user.avatar} className="h-7 w-7 rounded-full" alt="" referrerPolicy="no-referrer" />
            : <div className="grid h-7 w-7 place-items-center rounded-full bg-paper-300 text-2xs font-bold text-paper-900">{user?.name?.[0] ?? '?'}</div>}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-paper-900">{user?.name}</div>
              <div className="truncate text-2xs text-paper-500">{model}</div>
            </div>
          )}
          <button className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-paper-500 transition-colors hover:bg-paper-200 hover:text-paper-900"
            onClick={() => logout().then(() => nav('/login'))} title="Log out">
            <Icon d={I.out} size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}