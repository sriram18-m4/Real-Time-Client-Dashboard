export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActivityType =
  | 'TASK_CREATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'OVERDUE_FLAGGED'
  | 'COMMENT_ADDED';
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'STATUS_UPDATED'
  | 'TASK_OVERDUE'
  | 'PROJECT_UPDATED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
  updatedAt: string;
  projects?: Project[];
  _count?: { projects: number };
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  creator?: User;
  tasks?: Task[];
  _count?: { tasks: number };
}

export interface Task {
  id: number;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isOverdue: boolean;
  overdueAt: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  assignee?: User | null;
}

export interface TaskActivity {
  id: string;
  taskId: number;
  projectId: string;
  actorId: string | null;
  type: ActivityType;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  message: string | null;
  createdAt: string;
  actor?: { id: string; name: string; email: string } | null;
  task?: { id: number; title: string; projectId: string } | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  taskId: number | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  task?: { id: number; title: string; projectId: string } | null;
}

export interface DashboardMetrics {
  projectsCount: number;
  openTasksCount: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  onlineUsersCount: number;
  tasksByStatus: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  tasksByPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}
