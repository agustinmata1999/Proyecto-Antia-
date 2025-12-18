import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutsService {
  constructor(private prisma: PrismaService) {}

  async getByTipster(tipsterId: string) {
    return this.prisma.payout.findMany({
      where: { tipsterId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
