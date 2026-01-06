import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;
    this.logger.log(`Attempting database connection...`);
    this.logger.log(`DATABASE_URL configured: ${dbUrl ? 'YES' : 'NO'}`);
    if (dbUrl) {
      // Log sanitized URL (hide password)
      const sanitized = dbUrl.replace(/:[^:@]+@/, ':***@');
      this.logger.log(`DATABASE_URL: ${sanitized}`);
    }

    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // Test query to verify connection works
      const collections = await this.$runCommandRaw({ listCollections: 1 });
      this.logger.log(`✅ Database accessible, collections found`);
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error.message);
      this.logger.error('Full error:', JSON.stringify(error, null, 2));
      // Don't throw - let the app start and handle errors per-request
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
