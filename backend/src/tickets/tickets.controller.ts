import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() data: any) {
    return this.ticketsService.create(user.id, user.role === 'TIPSTER' ? 'TIPSTER' : 'CLIENT', data);
  }

  @Get('my')
  async getMy(@CurrentUser() user: any) {
    return this.ticketsService.findByUser(user.id);
  }
}
