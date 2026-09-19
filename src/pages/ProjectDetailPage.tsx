import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Project, Task, TaskStatus, TaskPriority, User } from '../types';
import {
  ArrowLeft,
  Plus,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  User as UserIcon,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';

const COLUMNS: Array<{ status: TaskStatus; label: string; color: string; border: string }> = [
  { status: 'TODO', label: 'To Do', color: 'bg-slate-800/80 text-slate-300', border: 'border-slate-800' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/30' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/30' },
  { status: 'DONE', label: 'Done', color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/30' },
];

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const { joinProject, leaveProject } = useSocket();
  const queryClient = useQueryClient();

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Join Socket.io project room for real-time task sync
  useEffect(() => {
    if (id) {
      joinProject(id);
      return () => {
        leaveProject(id);
      };
    }
  }, [id, joinProject, leaveProject]);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data.project;
    },
    enabled: !!id,
  });

  const { data: teamUsers } = useQuery<{ users: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users?take=50');
      return res.data;
    },
    enabled: hasRole('ADMIN', 'PROJECT_MANAGER'),
  });

  // Task Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: TaskStatus }) => {
      const res = await api.patch(`/tasks/${taskId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to update task status');
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: {
      projectId: string;
      title: string;
      description: string;
      priority: TaskPriority;
      dueDate: string;
      assigneeId?: string;
    }) => {
      const res = await api.post('/tasks', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsNewTaskOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setTaskAssigneeId('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create task');
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDueDate) {
      setError('Due date is required');
      return;
    }
    if (!id) return;

    createTaskMutation.mutate({
      projectId: id,
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      dueDate: new Date(taskDueDate).toISOString(),
      assigneeId: taskAssigneeId || undefined,
    });
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-sm font-semibold text-slate-300">Project Not Found</h3>
        <Link to="/projects" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
          Return to Projects
        </Link>
      </div>
    );
  }

  const tasks = project.tasks || [];

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
      {/* Back Link & Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-100">{project.name}</h1>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-mono">
                {tasks.length} tasks
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {project.description || 'No description provided.'}
            </p>
          </div>

          {hasRole('ADMIN', 'PROJECT_MANAGER') && (
            <button
              id="btn-create-task-open"
              onClick={() => setIsNewTaskOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);

          return (
            <div
              key={col.status}
              className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.border.replace('border-', 'bg-')}`} />
                  <span className="text-xs font-semibold text-slate-200">{col.label}</span>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="p-6 text-center text-[11px] text-slate-600 border border-dashed border-slate-800/60 rounded-xl">
                    No tasks in {col.label.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isAssignedToCurrentDev =
                      hasRole('DEVELOPER') && task.assigneeId === user?.id;
                    const canChangeStatus =
                      hasRole('ADMIN', 'PROJECT_MANAGER') || isAssignedToCurrentDev;

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
                          <span className="text-xs font-medium text-slate-100 leading-snug">
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

                        {task.description && (
                          <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Overdue Badge */}
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

                        {/* Status Transition Selector */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">Status:</span>
                          {canChangeStatus ? (
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
                              Dev View Only
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-100">Add Task to {project.name}</h3>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement payment gateway webhook"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assignee</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamUsers?.users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task specifications and criteria..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
