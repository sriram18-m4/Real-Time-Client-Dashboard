import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb, MemoryClient } from '../db/memoryStore.js';
import { Client } from '@prisma/client';

export class ClientRepository {
  async findById(id: string): Promise<Client | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.client.findUnique({
          where: { id },
          include: { projects: true },
        });
      } catch {
        // Fallback
      }
    }
    const client = memoryDb.clients.find((c) => c.id === id);
    if (!client) return null;
    const projects = memoryDb.projects.filter((p) => p.clientId === client.id);
    return { ...client, projects } as unknown as Client;
  }

  async findByEmail(email: string): Promise<Client | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.client.findUnique({ where: { email } });
      } catch {
        // Fallback
      }
    }
    const client = memoryDb.clients.find((c) => c.email.toLowerCase() === email.toLowerCase());
    return (client as unknown as Client) || null;
  }

  async findMany(params: {
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ clients: (Client & { projectCount: number })[]; total: number }> {
    const { search, skip = 0, take = 50 } = params;

    if (isDatabaseConnected()) {
      try {
        const where: any = {};
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [clients, total] = await Promise.all([
          prisma.client.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
              _count: {
                select: { projects: true },
              },
            },
          }),
          prisma.client.count({ where }),
        ]);

        const formatted = clients.map((c) => ({
          ...c,
          projectCount: c._count.projects,
        }));

        return { clients: formatted as any, total };
      } catch {
        // Fallback
      }
    }

    let filtered = [...memoryDb.clients];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    const total = filtered.length;
    const sliced = filtered.slice(skip, skip + take);
    const formatted = sliced.map((c) => {
      const projectCount = memoryDb.projects.filter((p) => p.clientId === c.id).length;
      return {
        ...c,
        projectCount,
      } as unknown as Client & { projectCount: number };
    });
    return { clients: formatted, total };
  }

  async create(data: { name: string; email: string; company: string }): Promise<Client> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.client.create({ data });
      } catch {
        // Fallback
      }
    }
    const newClient: MemoryClient = {
      id: `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      email: data.email,
      company: data.company,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryDb.clients.push(newClient);
    return newClient as unknown as Client;
  }

  async update(id: string, data: Partial<{ name: string; email: string; company: string }>): Promise<Client> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.client.update({
          where: { id },
          data,
        });
      } catch {
        // Fallback
      }
    }
    const idx = memoryDb.clients.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    memoryDb.clients[idx] = {
      ...memoryDb.clients[idx],
      ...data,
      updatedAt: new Date(),
    };
    return memoryDb.clients[idx] as unknown as Client;
  }

  async delete(id: string): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await prisma.client.delete({ where: { id } });
        return;
      } catch {
        // Fallback
      }
    }
    memoryDb.clients = memoryDb.clients.filter((c) => c.id !== id);
    // Cascade delete projects
    const projectIdsToDelete = memoryDb.projects.filter((p) => p.clientId === id).map((p) => p.id);
    memoryDb.projects = memoryDb.projects.filter((p) => p.clientId !== id);
    memoryDb.tasks = memoryDb.tasks.filter((t) => !projectIdsToDelete.includes(t.projectId));
  }
}

export const clientRepository = new ClientRepository();
