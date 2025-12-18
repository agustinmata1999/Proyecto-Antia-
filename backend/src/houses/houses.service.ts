import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HousesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.house.findMany({
      where: { status: 'ACTIVE' },
    });
  }
}
