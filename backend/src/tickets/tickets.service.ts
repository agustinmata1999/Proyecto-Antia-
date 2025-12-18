import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, role: any, data: any) {
    return this.prisma.ticket.create({
      data: {
        requesterId: userId,
        role,
        ...data,
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.ticket.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
