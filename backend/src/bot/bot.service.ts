import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BotService {
  constructor(private prisma: PrismaService) {}

  async validateLinkToken(token: string, telegramUserId: string) {
    // TODO: Verify JWT token
    return {
      valid: true,
      order: {},
    };
  }

  async syncPurchase(telegramUserId: string, orderRef?: string) {
    // Find pending orders
    return {
      synced: true,
    };
  }
}
