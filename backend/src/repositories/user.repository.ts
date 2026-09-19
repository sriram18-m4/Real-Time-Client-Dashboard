import { prisma, isDatabaseConnected } from '../db/prisma.js';
import { memoryDb, MemoryUser } from '../db/memoryStore.js';
import { Role, User } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.user.findUnique({ where: { email } });
      } catch {
        // Fallback to memory store
      }
    }
    const user = memoryDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return (user as unknown as User) || null;
  }

  async findById(id: string): Promise<User | null> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.user.findUnique({ where: { id } });
      } catch {
        // Fallback to memory store
      }
    }
    const user = memoryDb.users.find((u) => u.id === id);
    return (user as unknown as User) || null;
  }

  async findMany(params: {
    role?: Role;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ users: User[]; total: number }> {
    const { role, isActive, search, skip = 0, take = 50 } = params;

    if (isDatabaseConnected()) {
      try {
        const where: any = {};
        if (role) where.role = role;
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              lastSeenAt: true,
              createdAt: true,
              updatedAt: true,
              passwordHash: false,
            },
          }),
          prisma.user.count({ where }),
        ]);

        return { users: users as unknown as User[], total };
      } catch {
        // Fallback to memory store
      }
    }

    let filtered = [...memoryDb.users];
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (typeof isActive === 'boolean') filtered = filtered.filter((u) => u.isActive === isActive);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    const total = filtered.length;
    const sliced = filtered.slice(skip, skip + take);
    return { users: sliced as unknown as User[], total };
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: Role;
  }): Promise<User> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.user.create({ data });
      } catch {
        // Fallback to memory store
      }
    }
    const newUser: MemoryUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role,
      isActive: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryDb.users.push(newUser);
    return newUser as unknown as User;
  }

  async update(id: string, data: Partial<{
    name: string;
    role: Role;
    isActive: boolean;
    passwordHash: string;
    lastSeenAt: Date;
  }>): Promise<User> {
    if (isDatabaseConnected()) {
      try {
        return await prisma.user.update({
          where: { id },
          data,
        });
      } catch {
        // Fallback to memory store
      }
    }
    const idx = memoryDb.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found in memory store');
    memoryDb.users[idx] = {
      ...memoryDb.users[idx],
      ...data,
      updatedAt: new Date(),
    };
    return memoryDb.users[idx] as unknown as User;
  }

  async updateLastSeen(id: string, timestamp: Date): Promise<void> {
    if (isDatabaseConnected()) {
      try {
        await prisma.user.update({
          where: { id },
          data: { lastSeenAt: timestamp },
        });
        return;
      } catch {
        // Fallback to memory store
      }
    }
    const user = memoryDb.users.find((u) => u.id === id);
    if (user) user.lastSeenAt = timestamp;
  }
}

export const userRepository = new UserRepository();
