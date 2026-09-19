import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../errors/AppError.js';
import { Role, User } from '@prisma/client';

export class UserService {
  async listUsers(params: {
    role?: Role;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const { users, total } = await userRepository.findMany({
      role: params.role,
      isActive: params.isActive,
      search: params.search,
      skip,
      take: limit,
    });

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async listAssignableDevelopers(): Promise<User[]> {
    const { users } = await userRepository.findMany({
      role: Role.DEVELOPER,
      isActive: true,
      skip: 0,
      take: 100,
    });
    return users;
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }
    return user;
  }

  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }): Promise<User> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('A user with this email address already exists', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return await userRepository.create({
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role,
    });
  }

  async updateUser(id: string, data: {
    name?: string;
    role?: Role;
    isActive?: boolean;
    password?: string;
  }): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return await userRepository.update(id, updateData);
  }
}

export const userService = new UserService();
