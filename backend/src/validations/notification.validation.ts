import { z } from 'zod';

export const listNotificationsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    unreadOnly: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});

export const notificationQuerySchema = listNotificationsSchema;

export const markNotificationReadSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1, 'Notification ID is required'),
  }),
  query: z.object({}),
});

export const markAllNotificationsReadSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({}),
});

export const activityQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
});
