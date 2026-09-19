export enum SocketEvent {
  // Activity Feed
  ACTIVITY_NEW = 'activity:new',

  // Notifications
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_UNREAD_COUNT = 'notification:unread_count',

  // Presence
  PRESENCE_COUNT = 'presence:count',

  // Task updates
  TASK_UPDATED = 'task:updated',
  TASK_CREATED = 'task:created',

  // Room management
  JOIN_PROJECT = 'project:join',
  LEAVE_PROJECT = 'project:leave',
}

export interface ActivityEventPayload {
  id: string;
  taskId: number;
  projectId: string;
  projectName?: string;
  actorId: string | null;
  actorName: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  message: string;
  createdAt: string;
  formattedText: string; // "Ravi moved Task #12 from In Progress → In Review · just now"
}

export interface NotificationEventPayload {
  id: string;
  userId: string;
  taskId?: number | null;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}
