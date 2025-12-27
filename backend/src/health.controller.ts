import { Controller, Get, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { TelegramService } from './telegram/telegram.service';
import { EmailService } from './emails/emails.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TelegramService)) private telegramService: TelegramService,
    @Inject(forwardRef(() => EmailService)) private emailService: EmailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let dbStatus = 'unknown';
    let dbError = null;
    let usersCount = 0;
    
    try {
      // Try a simple raw query to check connection
      await this.prisma.$runCommandRaw({ ping: 1 });
      dbStatus = 'connected';
      
      // Count users to verify data exists
      const countResult = await this.prisma.$runCommandRaw({
        count: 'users'
      }) as any;
      usersCount = countResult?.n || 0;
    } catch (error) {
      dbStatus = 'error';
      dbError = error.message;
      console.error('Database health check failed:', error.message);
    }
    
    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      usersCount,
      ...(dbError && { error: dbError }),
      uptime: process.uptime(),
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasMongoUrl: !!process.env.MONGO_URL,
        appUrl: process.env.APP_URL || 'not set',
      }
    };
  }

  @Get('telegram')
  @ApiOperation({ summary: 'Check Telegram bot status' })
  async checkTelegram() {
    try {
      const status = await this.telegramService.getHealthStatus();
      return {
        status: status.webhookUrl ? 'ok' : 'no_webhook',
        ...status,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  @Get('email')
  @ApiOperation({ summary: 'Check email service status' })
  async checkEmail() {
    try {
      const status = this.emailService.getHealthStatus();
      return {
        status: status.isConfigured ? 'ok' : 'not_configured',
        ...status,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  @Get('services')
  @ApiOperation({ summary: 'Check all services status' })
  async checkAllServices() {
    const results: any = {
      timestamp: new Date().toISOString(),
    };

    // Database
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      results.database = { status: 'ok' };
    } catch (error) {
      results.database = { status: 'error', error: error.message };
    }

    // Telegram
    try {
      const telegramStatus = await this.telegramService.getHealthStatus();
      results.telegram = {
        status: telegramStatus.webhookUrl ? 'ok' : 'no_webhook',
        ...telegramStatus,
      };
    } catch (error) {
      results.telegram = { status: 'error', error: error.message };
    }

    // Email
    try {
      const emailStatus = this.emailService.getHealthStatus();
      results.email = {
        status: emailStatus.isConfigured ? 'ok' : 'not_configured',
        ...emailStatus,
      };
    } catch (error) {
      results.email = { status: 'error', error: error.message };
    }

    results.allOk = results.database?.status === 'ok' 
      && results.telegram?.status === 'ok' 
      && results.email?.status === 'ok';

    return results;
  }

  @Get('check-user')
  @ApiOperation({ summary: 'Check if user exists (debug)' })
  async checkUser(@Query('email') email: string) {
    if (!email) {
      return { error: 'Email parameter required' };
    }
    
    try {
      const result = await this.prisma.$runCommandRaw({
        find: 'users',
        filter: { email },
        limit: 1
      }) as any;
      
      const users = result?.cursor?.firstBatch || [];
      
      if (users.length > 0) {
        const user = users[0];
        return {
          found: true,
          email: user.email,
          role: user.role,
          status: user.status,
          hasPassword: !!user.password_hash,
        };
      }
      
      return { found: false, email };
    } catch (error) {
      return { error: error.message };
    }
  }
}
