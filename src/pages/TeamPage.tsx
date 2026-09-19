import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { User, Role } from '../types';
import { Users, Plus, Mail, Circle, ShieldCheck, Calendar, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export const TeamPage: React.FC = () => {
  const { hasRole, user: currentUser } = useAuth();
  const { onlineUserIds } = useSocket();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('DEVELOPER');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users?take=100');
      return res.data;
    },
    refetchInterval: 10000,
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; password?: string; role: Role }) => {
      const res = await api.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('DEVELOPER');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create team member');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({ name, email, password: password || 'Password123!', role });
  };

  const users = data?.users || [];

  const getRoleBadge = (userRole: Role) => {
    switch (userRole) {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Team & Presence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time active status, roles, and agency personnel
          </p>
        </div>

        {hasRole('ADMIN') && (
          <button
            id="btn-add-team-member-open"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading team members...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((member) => {
            const isOnline = onlineUserIds.includes(member.id) || member.id === currentUser?.id;

            return (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 font-bold text-slate-300 border border-slate-700/60">
                      {member.name.charAt(0)}
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                          isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-600'
                        }`}
                        title={isOnline ? 'Online via WebSocket' : 'Offline'}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{member.name}</h3>
                      <span
                        className={`inline-block mt-0.5 rounded px-2 py-0.2 text-[10px] font-mono border uppercase tracking-wider ${getRoleBadge(
                          member.role
                        )}`}
                      >
                        {member.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-medium flex items-center gap-1 ${
                      isOnline ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    <Circle
                      className={`h-2 w-2 ${isOnline ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-600 text-slate-600'}`}
                    />
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {isOnline
                        ? 'Active right now'
                        : `Last active ${formatDistanceToNow(new Date(member.lastSeenAt || member.updatedAt), { addSuffix: true })}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-100">Add Team Member</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@agency.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="DEVELOPER">Developer (Task status updates only)</option>
                  <option value="PROJECT_MANAGER">Project Manager (Scoped project owner)</option>
                  <option value="ADMIN">Admin (Full agency oversight)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defaults to Password123!"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
