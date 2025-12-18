import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  @Get('my')
  @Roles('CLIENT')
  @ApiOperation({ summary: 'Get my orders (Client only)' })
  async getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.findByClient(user.id);
  }

  @Get('sales')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get my sales (Tipster only)' })
  async getMySales(@CurrentUser() user: any) {
    return this.ordersService.findSalesByTipster(user.id);
  }

  @Get('stats')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get my sales stats (Tipster only)' })
  async getMyStats(@CurrentUser() user: any) {
    return this.ordersService.getStatsByTipster(user.id);
  }
}
