import { Controller, Get } from '@nestjs/common';
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
    
    try {
      // Try a simple raw query to check connection
      await this.prisma.$runCommandRaw({ ping: 1 });
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
      dbError = error.message;
      console.error('Database health check failed:', error.message);
    }
    
    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      ...(dbError && { error: dbError }),
      uptime: process.uptime(),
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasMongoUrl: !!process.env.MONGO_URL,
        appUrl: process.env.APP_URL || 'not set',
      }
    };
  }
}
