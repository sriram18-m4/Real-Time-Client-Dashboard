import { clientRepository } from '../repositories/client.repository.js';
import { AppError } from '../errors/AppError.js';
import { Client } from '@prisma/client';

export class ClientService {
  async listClients(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ clients: any[]; total: number; page: number; totalPages: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const { clients, total } = await clientRepository.findMany({
      search: params.search,
      skip,
      take: limit,
    });

    return {
      clients,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getClientById(id: string): Promise<Client> {
    const client = await clientRepository.findById(id);
    if (!client) {
      throw AppError.notFound(`Client with ID ${id} not found`, 'CLIENT_NOT_FOUND');
    }
    return client;
  }

  async createClient(data: { name: string; email: string; company: string }): Promise<Client> {
    const existing = await clientRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('A client with this email address already exists', 'CLIENT_EMAIL_EXISTS');
    }
    return await clientRepository.create(data);
  }

  async updateClient(id: string, data: { name?: string; email?: string; company?: string }): Promise<Client> {
    const client = await clientRepository.findById(id);
    if (!client) {
      throw AppError.notFound(`Client with ID ${id} not found`, 'CLIENT_NOT_FOUND');
    }

    if (data.email && data.email.toLowerCase() !== client.email.toLowerCase()) {
      const existing = await clientRepository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw AppError.conflict('A client with this email address already exists', 'CLIENT_EMAIL_EXISTS');
      }
    }

    return await clientRepository.update(id, data);
  }

  async deleteClient(id: string): Promise<void> {
    const client = await clientRepository.findById(id);
    if (!client) {
      throw AppError.notFound(`Client with ID ${id} not found`, 'CLIENT_NOT_FOUND');
    }
    await clientRepository.delete(id);
  }
}

export const clientService = new ClientService();
