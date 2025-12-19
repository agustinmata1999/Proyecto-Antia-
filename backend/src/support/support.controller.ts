import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupportService, CreateTicketDto } from './support.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ==================== CLIENT ENDPOINTS ====================

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(
    @CurrentUser() user: any,
    @Body() body: CreateTicketDto,
  ) {
    return this.supportService.createTicket(user.id, user.email, body);
  }

  @Get('tickets/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my support tickets' })
  async getMyTickets(@CurrentUser() user: any) {
    return this.supportService.getMyTickets(user.id);
  }

  @Get('tickets/my/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my ticket details' })
  async getMyTicketDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const ticket = await this.supportService.getTicketDetails(user.id, id);
    
    if (!ticket) {
      return { error: 'Ticket no encontrado' };
    }
    
    return ticket;
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all support tickets (admin)' })
  async getAllTickets(@Query('status') status?: string) {
    return this.supportService.getAllTickets(status);
  }

  @Put('admin/tickets/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket (admin)' })
  async updateTicket(
    @Param('id') id: string,
    @Body() body: {
      status?: string;
      priority?: string;
      adminNotes?: string;
    },
  ) {
    return this.supportService.updateTicket(id, body);
  }
}
