import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Building2, Circle } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { onlineUserIds } = useSocket();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, visible: true },
    { to: '/projects', label: 'Projects', icon: FolderKanban, visible: hasRole('ADMIN', 'PROJECT_MANAGER') },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare, visible: true },
    { to: '/clients', label: 'Clients', icon: Building2, visible: hasRole('ADMIN', 'PROJECT_MANAGER') },
    { to: '/team', label: 'Team', icon: Users, visible: hasRole('ADMIN', 'PROJECT_MANAGER') },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 hidden md:flex flex-col justify-between p-4">
      <div>
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Navigation
        </div>
        <nav className="space-y-1 mt-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* Real-time Team Presence Widget */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Live Presence
          </span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {onlineUserIds.length} active
          </span>
        </div>
        <div className="text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 truncate">{user?.name} (You)</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
              Online
            </span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
            Real-time status broadcasted over WebSocket
          </p>
        </div>
      </div>
    </aside>
  );
};
