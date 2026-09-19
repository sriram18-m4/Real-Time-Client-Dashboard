import { z } from 'zod';

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Client name is required'),
    email: z.string().email('Valid client email is required'),
    company: z.string().min(2, 'Company name is required'),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateClientSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    company: z.string().min(2).optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Client ID is required'),
  }),
  query: z.object({}),
});

export const getClientByIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1, 'Client ID is required'),
  }),
  query: z.object({}),
});

export const listClientsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
  }),
});

export const clientQuerySchema = listClientsSchema;

export const deleteClientSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().min(1, 'Client ID is required'),
  }),
  query: z.object({}),
});
