import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmailService } from './emails.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin/emails')
@Controller('admin/emails')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@ApiBearerAuth()
export class EmailsController {
  constructor(private emailService: EmailService) {}

  /**
   * Get email logs
   */
  @Get('logs')
  @ApiOperation({ summary: 'Get email logs (admin only)' })
  async getEmailLogs(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.emailService.getEmailLogs({
      type,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return { logs };
  }

  /**
   * Check email service status
   */
  @Get('status')
  @ApiOperation({ summary: 'Check email service status' })
  async getStatus() {
    return {
      configured: this.emailService.isReady(),
      mode: this.emailService.isReady() ? 'production' : 'development',
      message: this.emailService.isReady() 
        ? 'Resend API configured and ready' 
        : 'Running in dev mode - emails logged only',
    };
  }
}
