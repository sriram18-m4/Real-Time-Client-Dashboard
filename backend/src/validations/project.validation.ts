import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name is required'),
    description: z.string().optional(),
    clientId: z.string().min(1, 'Client ID is required'),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    clientId: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({}),
});

export const getProjectByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({}),
});

export const listProjectsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    clientId: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export const projectQuerySchema = listProjectsSchema;

export const deleteProjectSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({}),
});
