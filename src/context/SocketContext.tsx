import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Task, TaskActivity, AppNotification } from '../types';

interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
  toasts: ToastAlert[];
  removeToast: (id: string) => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const addToast = useCallback((title: string, message: string, type: ToastAlert['type'] = 'info') => {
    const newToast: ToastAlert = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      message,
      type,
      timestamp: new Date(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!user || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
        setOnlineUserIds([]);
      }
      return;
    }

    // STRICT REQUIREMENT: transports: ["websocket"] on BOTH server and client
    const socketInstance = io('/', {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', () => {
      setIsConnected(false);
    });

    // 1. Presence updates
    socketInstance.on('user:presence', (data: { userId: string; isOnline: boolean; onlineUsers?: string[] }) => {
      if (Array.isArray(data.onlineUsers)) {
        setOnlineUserIds(data.onlineUsers);
      } else if (data.userId) {
        setOnlineUserIds((prev) => {
          if (data.isOnline) {
            return prev.includes(data.userId) ? prev : [...prev, data.userId];
          } else {
            return prev.filter((id) => id !== data.userId);
          }
        });
      }
    });

    // 2. Task Created
    socketInstance.on('task:created', (data: { task: Task; activity: TaskActivity }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      addToast('New Task Created', `"${data.task.title}" was added.`, 'info');
    });

    // 3. Task Status Changed
    socketInstance.on('task:status_changed', (data: { task: Task; activity: TaskActivity }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      addToast(
        'Task Status Updated',
        `Task #${data.task.id} changed to ${data.task.status.replace('_', ' ')}.`,
        'success'
      );
    });

    // 4. Overdue Task Flagged
    socketInstance.on('task:overdue_flagged', (data: { task: Task; activity: TaskActivity }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      addToast('⚠️ Task Overdue Alert', `Task #${data.task.id} "${data.task.title}" is now overdue!`, 'error');
    });

    // 5. Activity Feed Item
    socketInstance.on('activity:new', () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    // 6. In-App Notification
    socketInstance.on('notification:new', (notification: AppNotification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      addToast(notification.title, notification.message, 'warning');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user, accessToken, queryClient, addToast]);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('project:join', { projectId });
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('project:leave', { projectId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineUserIds,
        toasts,
        removeToast,
        joinProject,
        leaveProject,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
