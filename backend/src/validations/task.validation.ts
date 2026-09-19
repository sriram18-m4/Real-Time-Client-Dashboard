import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    title: z.string().min(2, 'Task title is required'),
    description: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date format for dueDate',
    }),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date format for dueDate',
    }).optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Task ID must be positive integer'),
  }),
  query: z.object({}),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Task ID must be positive integer'),
  }),
  query: z.object({}),
});

export const getTaskByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.coerce.number().int().positive('Task ID must be positive integer'),
  }),
  query: z.object({}),
});

export const listTasksSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    projectId: z.string().optional(),
    assigneeId: z.string().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueFrom: z.string().optional(),
    dueTo: z.string().optional(),
    isOverdue: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export const taskQuerySchema = listTasksSchema;

export const deleteTaskSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.coerce.number().int().positive('Task ID must be positive integer'),
  }),
  query: z.object({}),
});
