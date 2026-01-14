import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminChannelMonitorService } from './admin-channel-monitor.service';

@Controller('admin/channel-monitor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERADMIN')
export class AdminChannelMonitorController {
  constructor(private readonly monitorService: AdminChannelMonitorService) {}

  /**
   * Get all tipsters that have channels (for dropdown)
   */
  @Get('tipsters')
  async getTipstersWithChannels() {
    return this.monitorService.getTipstersWithChannels();
  }

  /**
   * Get all monitorable channels, optionally filtered by tipster
   */
  @Get('channels')
  async getMonitorableChannels(@Query('tipsterId') tipsterId?: string) {
    return this.monitorService.getMonitorableChannels(tipsterId);
  }

  /**
   * Get monitoring stats
   */
  @Get('stats')
  async getMonitoringStats() {
    return this.monitorService.getMonitoringStats();
  }

  /**
   * Toggle monitoring for a specific channel
   */
  @Post('channels/:channelId/toggle')
  async toggleMonitoring(
    @Param('channelId') channelId: string,
    @Body() body: { enable: boolean },
    @Request() req: any,
  ) {
    return this.monitorService.toggleMonitoring(
      channelId,
      body.enable,
      req.user.email,
    );
  }

  /**
   * Get messages from a monitored channel
   */
  @Get('channels/:channelId/messages')
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.monitorService.getChannelMessages(channelId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
