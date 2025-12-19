import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

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
