import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']).default('DEVELOPER'),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  query: z.object({}),
});

export const getUserByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  query: z.object({}),
});

export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export const userQuerySchema = listUsersSchema;

export const listAssignableDevelopersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({}),
});
