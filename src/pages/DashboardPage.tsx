import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { DashboardMetrics, TaskActivity, Task } from '../types';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  ArrowUpRight,
  User,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { onlineUserIds } = useSocket();

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const res = await api.get('/dashboard/metrics');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: activitiesData } = useQuery<{ activities: TaskActivity[] }>({
    queryKey: ['activities', 'feed'],
    queryFn: async () => {
      const res = await api.get('/activity?limit=10');
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: overdueTasksData } = useQuery<{ tasks: Task[] }>({
    queryKey: ['tasks', 'overdue'],
    queryFn: async () => {
      const res = await api.get('/tasks?isOverdue=true&limit=5');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const activities = activitiesData?.activities || [];
  const overdueTasks = overdueTasksData?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Welcome & Role Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 to-slate-900/60 p-5 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Role: <span className="font-semibold text-indigo-400">{user?.role.replace('_', ' ')}</span> | Scoped access active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRole('ADMIN', 'PROJECT_MANAGER') && (
            <Link
              to="/projects"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <FolderKanban className="h-4 w-4" />
              Manage Projects
            </Link>
          )}
          <Link
            to="/tasks"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Task Board
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Projects */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Projects</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-100">
            {metricsLoading ? '...' : metrics?.projectsCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasRole('DEVELOPER') ? 'Projects with your assigned tasks' : 'Active client engagements'}
          </p>
        </div>

        {/* Open Tasks */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Open Tasks</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-100">
            {metricsLoading ? '...' : metrics?.openTasksCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">In Todo, In Progress & Review</p>
        </div>

        {/* Overdue Tasks Alert Card */}
        <div
          className={`rounded-2xl border p-4 shadow-sm transition-colors ${
            (metrics?.overdueTasksCount ?? 0) > 0
              ? 'border-rose-500/40 bg-rose-950/20'
              : 'border-slate-800/80 bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Overdue Tasks</span>
            <div
              className={`rounded-lg p-2 border ${
                (metrics?.overdueTasksCount ?? 0) > 0
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-400">
            {metricsLoading ? '...' : metrics?.overdueTasksCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Flagged by background cron</p>
        </div>

        {/* Online Team Presence */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Live Team Presence</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400">
            {onlineUserIds.length || metrics?.onlineUsersCount || 1}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Connected via WebSocket</p>
        </div>
      </div>

      {/* Grid: Task Status Distribution & Overdue Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Task Pipeline Distribution</h3>
          {metrics && (
            <div className="space-y-3">
              {[
                { label: 'Todo', count: metrics.tasksByStatus.TODO, color: 'bg-slate-600', textColor: 'text-slate-300' },
                { label: 'In Progress', count: metrics.tasksByStatus.IN_PROGRESS, color: 'bg-blue-500', textColor: 'text-blue-400' },
                { label: 'In Review', count: metrics.tasksByStatus.IN_REVIEW, color: 'bg-amber-500', textColor: 'text-amber-400' },
                { label: 'Done', count: metrics.tasksByStatus.DONE, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
              ].map((item) => {
                const total =
                  metrics.tasksByStatus.TODO +
                  metrics.tasksByStatus.IN_PROGRESS +
                  metrics.tasksByStatus.IN_REVIEW +
                  metrics.tasksByStatus.DONE;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-medium ${item.textColor}`}>{item.label}</span>
                      <span className="text-slate-400">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue Task Watchlist */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-slate-200">Overdue Task Watchlist</h3>
              </div>
              <Link to="/tasks?overdue=true" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {overdueTasks.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60 mb-2" />
                <p className="text-xs text-slate-400">Zero overdue tasks! All assignments are on schedule.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {overdueTasks.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200 truncate">{t.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 uppercase">
                          Overdue
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span>Project: {t.project?.name || 'Project'}</span>
                        <span>Assignee: {t.assignee?.name || 'Unassigned'}</span>
                        <span className="text-rose-400">Due: {format(new Date(t.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <Link
                      to="/tasks"
                      className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                    >
                      Update
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Automated node-cron scans active every 5 minutes</span>
            <span className="font-mono text-slate-400">Cron: */5 * * * *</span>
          </div>
        </div>
      </div>

      {/* Live Real-Time Activity Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-200">Live Activity Stream</h3>
          </div>
          <span className="text-xs text-slate-500">Real-time socket updates</span>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No activity recorded yet</div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs transition-colors hover:border-slate-700"
              >
                <div className="rounded-full bg-slate-800 p-1.5 text-slate-300 shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200">
                    <span className="font-semibold text-indigo-300">
                      {act.actor?.name || 'Automated System'}
                    </span>{' '}
                    {act.message || `updated task #${act.taskId}`}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
