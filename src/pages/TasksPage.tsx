import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Task, TaskStatus, TaskPriority } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Kanban,
  List,
  User,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string; dotColor: string }> = [
  { status: 'TODO', label: 'To Do', dotColor: 'bg-slate-500' },
  { status: 'IN_PROGRESS', label: 'In Progress', dotColor: 'bg-blue-500' },
  { status: 'IN_REVIEW', label: 'In Review', dotColor: 'bg-amber-500' },
  { status: 'DONE', label: 'Done', dotColor: 'bg-emerald-500' },
];

export const TasksPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyMyTasks, setOnlyMyTasks] = useState(hasRole('DEVELOPER'));

  // Build query params
  const queryParams = new URLSearchParams();
  if (selectedStatus !== 'ALL') queryParams.append('status', selectedStatus);
  if (selectedPriority !== 'ALL') queryParams.append('priority', selectedPriority);
  if (onlyOverdue) queryParams.append('isOverdue', 'true');
  if (onlyMyTasks && user) queryParams.append('assigneeId', user.id);
  if (search.trim()) queryParams.append('search', search.trim());
  queryParams.append('limit', '100');

  const { data, isLoading } = useQuery<{ tasks: Task[]; total: number }>({
    queryKey: ['tasks', queryParams.toString()],
    queryFn: async () => {
      const res = await api.get(`/tasks?${queryParams.toString()}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: TaskStatus }) => {
      const res = await api.patch(`/tasks/${taskId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to update task status');
    },
  });

  const tasks = data?.tasks || [];

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Task Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasRole('DEVELOPER')
              ? 'View and transition status for your assigned tasks'
              : 'Global agency task pipeline and oversight'}
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task title or description..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Overdue Only Filter */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
          />
          <span className="flex items-center gap-1 text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue Only
          </span>
        </label>

        {/* My Tasks Only */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyMyTasks}
            onChange={(e) => setOnlyMyTasks(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
          />
          <span>My Tasks Only</span>
        </label>
      </div>

      {/* Task Content: Kanban or List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No Tasks Match Criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 min-h-[500px]"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-semibold text-slate-200">{col.label}</span>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {colTasks.map((task) => {
                    const isMyTask = task.assigneeId === user?.id;
                    const canEdit = hasRole('ADMIN', 'PROJECT_MANAGER') || isMyTask;

                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border p-3.5 shadow-sm transition-all bg-slate-900/90 ${
                          task.isOverdue
                            ? 'border-rose-500/40 shadow-rose-950/20'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-100 leading-snug">
                            {task.title}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-400">
                          <span className="text-indigo-400 font-medium">
                            {task.project?.name || 'Project'}
                          </span>
                        </div>

                        {task.isOverdue && (
                          <div className="mt-2 flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Overdue past due date</span>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                          </div>
                          <span className="truncate max-w-[100px] text-slate-300">
                            {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">Status:</span>
                          {canEdit ? (
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  taskId: task.id,
                                  status: e.target.value as TaskStatus,
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="DONE">Done</option>
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              View Only
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800">
            {tasks.map((task) => {
              const isMyTask = task.assigneeId === user?.id;
              const canEdit = hasRole('ADMIN', 'PROJECT_MANAGER') || isMyTask;

              return (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">{task.title}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-semibold border ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      {task.isOverdue && (
                        <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 text-[9px] font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Project: {task.project?.name || 'Project'}</span>
                      <span>Assignee: {task.assignee?.name || 'Unassigned'}</span>
                      <span>Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            taskId: task.id,
                            status: e.target.value as TaskStatus,
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono px-2 py-1 rounded bg-slate-800">
                        {task.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
