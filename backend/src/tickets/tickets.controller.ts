import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService, TicketStatus } from './tickets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  /**
   * Create a new ticket (user)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(@CurrentUser() user: any, @Body() body: { subject: string; message: string }) {
    return this.ticketsService.createTicket({
      userId: user.id,
      userEmail: user.email,
      userType: user.role === 'TIPSTER' ? 'TIPSTER' : 'CLIENT',
      subject: body.subject,
      message: body.message,
    });
  }

  /**
   * Get my tickets (user)
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my tickets' })
  async getMyTickets(@CurrentUser() user: any) {
    const tickets = await this.ticketsService.getTicketsByUser(user.id);
    return { tickets };
  }

  /**
   * Get ticket detail (user)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket by ID' })
  async getTicket(@CurrentUser() user: any, @Param('id') id: string) {
    // If admin, don't filter by userId
    const userId = ['SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(user.role) ? undefined : user.id;
    return this.ticketsService.getTicketById(id, userId);
  }

  /**
   * Reply to ticket (user)
   */
  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a ticket' })
  async replyToTicket(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    const isAdmin = ['SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(user.role);
    return this.ticketsService.addResponse({
      ticketId: id,
      message: body.message,
      responderId: user.id,
      isAdmin,
    });
  }

  // =============================================
  // ADMIN ENDPOINTS
  // =============================================

  /**
   * Get all tickets (admin)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tickets (admin)' })
  async getAllTickets(
    @Query('status') status?: TicketStatus,
    @Query('userType') userType?: string,
  ) {
    const tickets = await this.ticketsService.getAllTickets({ status, userType });
    return { tickets };
  }

  /**
   * Get ticket stats (admin)
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ticket statistics (admin)' })
  async getStats() {
    return this.ticketsService.getStats();
  }

  /**
   * Update ticket status (admin)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket status (admin)' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: TicketStatus }) {
    return this.ticketsService.updateStatus(id, body.status);
  }
}
