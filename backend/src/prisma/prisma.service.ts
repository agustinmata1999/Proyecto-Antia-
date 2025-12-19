import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30) || 'NOT SET');
      // Don't throw - let the app start and handle errors per-request
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
