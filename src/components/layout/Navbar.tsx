import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Activity, LogOut, Radio } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, onlineUserIds } = useSocket();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'PROJECT_MANAGER':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'DEVELOPER':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 sm:px-6 backdrop-blur">
      {/* Brand & Connection State */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-100 hidden sm:inline-block">
              Agency Pulse
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 hidden sm:block">
              Real-Time Project Ops
            </span>
          </div>
        </div>

        {/* WebSocket Status Indicator */}
        <div
          id="socket-status-pill"
          className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-xs border border-slate-700/60"
          title={`Transport: WebSocket | Online Users: ${onlineUserIds.length}`}
        >
          <span className="relative flex h-2 w-2">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
          </span>
          <span className="text-[11px] font-medium text-slate-300 hidden md:inline">
            {isConnected ? 'Live WebSocket' : 'Connecting...'}
          </span>
          <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 ml-1">
            {onlineUserIds.length} online
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationDropdown />

        {/* User Info & Role Badge */}
        {user && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                {user.name}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase tracking-wider self-end mt-0.5 ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role.replace('_', ' ')}
              </span>
            </div>

            <button
              id="btn-navbar-logout"
              onClick={logout}
              title="Logout"
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
