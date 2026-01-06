import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - Support')
@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@ApiBearerAuth()
export class AdminSupportController {
  private readonly logger = new Logger(AdminSupportController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Get all support tickets' })
  @ApiQuery({ name: 'status', required: false })
  async getAllTickets(@Query('status') status?: string) {
    try {
      const filter: any = {};
      if (status) {
        filter.status = status;
      }

      const ticketsResult = (await this.prisma.$runCommandRaw({
        find: 'support_tickets',
        filter,
        sort: { created_at: -1 },
        limit: 200,
      })) as any;

      const tickets = ticketsResult.cursor?.firstBatch || [];

      // Get user info for each ticket
      const userIds = [...new Set(tickets.map((t: any) => t.user_id).filter(Boolean))];

      const usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const usersResult = (await this.prisma.$runCommandRaw({
          find: 'users',
          filter: { _id: { $in: userIds.map((id: string) => ({ $oid: id })) } },
          projection: { email: 1, name: 1, role: 1 },
        })) as any;
        const users = usersResult.cursor?.firstBatch || [];
        users.forEach((u: any) => {
          const id = u._id.$oid || u._id;
          usersMap[id] = u;
        });
      }

      // Get tipster profiles for tipster users
      const tipsterUserIds = Object.entries(usersMap)
        .filter(([_, u]: [string, any]) => u.role === 'TIPSTER')
        .map(([id]) => id);

      const tipsterNames: Record<string, string> = {};
      if (tipsterUserIds.length > 0) {
        const tipstersResult = (await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { od_user_id: { $in: tipsterUserIds } },
          projection: { od_user_id: 1, public_name: 1 },
        })) as any;
        const tipsters = tipstersResult.cursor?.firstBatch || [];
        tipsters.forEach((t: any) => {
          tipsterNames[t.od_user_id] = t.public_name;
        });
      }

      const enrichedTickets = tickets.map((ticket: any) => {
        const user = usersMap[ticket.user_id] || {};
        return {
          id: ticket._id.$oid || ticket._id,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status || 'OPEN',
          userId: ticket.user_id,
          userEmail: user.email || 'N/A',
          userName:
            tipsterNames[ticket.user_id] || user.name || user.email?.split('@')[0] || 'Usuario',
          userRole: user.role || 'CLIENT',
          responses: ticket.responses || [],
          createdAt: ticket.created_at?.$date || ticket.created_at,
          updatedAt: ticket.updated_at?.$date || ticket.updated_at,
        };
      });

      return { tickets: enrichedTickets };
    } catch (error) {
      this.logger.error('Error fetching tickets:', error);
      return { tickets: [] };
    }
  }

  @Get('tickets/stats')
  @ApiOperation({ summary: 'Get ticket statistics' })
  async getTicketStats() {
    try {
      const allTicketsResult = (await this.prisma.$runCommandRaw({
        find: 'support_tickets',
        projection: { status: 1 },
      })) as any;

      const tickets = allTicketsResult.cursor?.firstBatch || [];

      const stats = {
        open: tickets.filter((t: any) => t.status === 'OPEN' || !t.status).length,
        inProgress: tickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter((t: any) => t.status === 'RESOLVED').length,
      };

      return stats;
    } catch (error) {
      this.logger.error('Error fetching ticket stats:', error);
      return { open: 0, inProgress: 0, resolved: 0 };
    }
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details' })
  async getTicket(@Param('id') id: string) {
    try {
      const ticketResult = (await this.prisma.$runCommandRaw({
        find: 'support_tickets',
        filter: { _id: { $oid: id } },
        limit: 1,
      })) as any;

      const ticket = ticketResult.cursor?.firstBatch?.[0];

      if (!ticket) {
        return { error: 'Ticket no encontrado' };
      }

      // Get user info
      let user: any = {};
      if (ticket.user_id) {
        const userResult = (await this.prisma.$runCommandRaw({
          find: 'users',
          filter: { _id: { $oid: ticket.user_id } },
          projection: { email: 1, name: 1, role: 1 },
          limit: 1,
        })) as any;
        user = userResult.cursor?.firstBatch?.[0] || {};
      }

      // Get tipster name if tipster
      let tipsterName = '';
      if (user.role === 'TIPSTER') {
        const tipsterResult = (await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { od_user_id: ticket.user_id },
          projection: { public_name: 1 },
          limit: 1,
        })) as any;
        tipsterName = tipsterResult.cursor?.firstBatch?.[0]?.public_name || '';
      }

      return {
        ticket: {
          id: ticket._id.$oid || ticket._id,
          subject: ticket.subject,
          message: ticket.message,
          status: ticket.status || 'OPEN',
          userId: ticket.user_id,
          userEmail: user.email || 'N/A',
          userName: tipsterName || user.name || user.email?.split('@')[0] || 'Usuario',
          userRole: user.role || 'CLIENT',
          responses: ticket.responses || [],
          createdAt: ticket.created_at?.$date || ticket.created_at,
          updatedAt: ticket.updated_at?.$date || ticket.updated_at,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching ticket:', error);
      return { error: 'Error al obtener ticket' };
    }
  }

  @Post('tickets/:id/reply')
  @ApiOperation({ summary: 'Reply to a ticket (admin)' })
  async replyToTicket(@Param('id') id: string, @Body() body: { message: string }) {
    try {
      const response = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        message: body.message,
        isAdmin: true,
        createdAt: new Date().toISOString(),
      };

      // Try with string ID first (most IDs are UUIDs stored as strings)
      await this.prisma.$runCommandRaw({
        findAndModify: 'support_tickets',
        query: { _id: id },
        update: {
          $push: { responses: response },
          $set: { updated_at: new Date().toISOString() },
        },
      });

      this.logger.log(`Admin replied to ticket ${id}`);

      return { success: true, response };
    } catch (error) {
      this.logger.error('Error replying to ticket:', error);
      return { success: false, error: 'Error al responder' };
    }
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  async updateTicketStatus(@Param('id') id: string, @Body() body: { status: string }) {
    try {
      const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
      if (!validStatuses.includes(body.status)) {
        return { success: false, error: 'Estado inválido' };
      }

      await this.prisma.$runCommandRaw({
        update: 'support_tickets',
        updates: [
          {
            q: { _id: { $oid: id } },
            u: {
              $set: {
                status: body.status,
                updated_at: new Date().toISOString(),
                ...(body.status === 'RESOLVED' ? { resolved_at: new Date().toISOString() } : {}),
              },
            },
          },
        ],
      });

      this.logger.log(`Ticket ${id} status updated to ${body.status}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating ticket status:', error);
      return { success: false, error: 'Error al actualizar estado' };
    }
  }
}
