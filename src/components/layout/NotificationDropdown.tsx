import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AppNotification } from '../../types';
import { Bell, CheckCheck, Clock, AlertTriangle, UserCheck, FolderSync, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery<{ notifications: AppNotification[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=20');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case 'TASK_ASSIGNED':
        return <UserCheck className="h-4 w-4 text-emerald-400" />;
      case 'PROJECT_UPDATED':
        return <FolderSync className="h-4 w-4 text-sky-400" />;
      default:
        return <Info className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="btn-notifications-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900/90 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && markOneMutation.mutate(notif.id)}
                  className={`flex gap-3 p-3.5 transition-colors cursor-pointer ${
                    notif.isRead ? 'bg-slate-900/50 hover:bg-slate-800/40 opacity-70' : 'bg-slate-800/40 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="mt-0.5 rounded-lg bg-slate-800 p-2 shrink-0 h-fit border border-slate-700/60">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs truncate ${notif.isRead ? 'font-medium text-slate-300' : 'font-semibold text-slate-100'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
