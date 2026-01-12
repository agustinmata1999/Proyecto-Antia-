import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WithdrawalsService } from './withdrawals.service';

// DTO para crear solicitud
class CreateWithdrawalDto {
  amountCents: number;
  notes?: string;
}

// DTO para aprobar/pagar
class PayWithdrawalDto {
  paymentMethod: string;
  paymentReference?: string;
  adminNotes?: string;
}

// DTO para rechazar
class RejectWithdrawalDto {
  rejectionReason: string;
}

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalsController {
  private readonly logger = new Logger(WithdrawalsController.name);

  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  // ==================== TIPSTER ENDPOINTS ====================

  /**
   * Obtener saldo disponible para retiro
   */
  @Get('balance')
  @UseGuards(RolesGuard)
  @Roles('TIPSTER')
  async getBalance(@Request() req) {
    return this.withdrawalsService.getAvailableBalance(req.user.sub);
  }

  /**
   * Crear solicitud de retiro
   */
  @Post('request')
  @UseGuards(RolesGuard)
  @Roles('TIPSTER')
  async createRequest(@Request() req, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.createWithdrawalRequest(req.user.sub, dto);
  }

  /**
   * Obtener mis solicitudes de retiro
   */
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles('TIPSTER')
  async getMyWithdrawals(@Request() req) {
    const withdrawals = await this.withdrawalsService.getTipsterWithdrawals(req.user.sub);
    return { withdrawals };
  }
}

// ==================== ADMIN CONTROLLER ====================

@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERADMIN')
export class AdminWithdrawalsController {
  private readonly logger = new Logger(AdminWithdrawalsController.name);

  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  /**
   * Obtener todas las solicitudes de retiro
   */
  @Get()
  async getAllWithdrawals(
    @Query('status') status?: string,
    @Query('tipsterId') tipsterId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.withdrawalsService.getAllWithdrawals({ status, tipsterId, startDate, endDate });
  }

  /**
   * Aprobar solicitud
   */
  @Patch(':id/approve')
  async approveWithdrawal(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: { adminNotes?: string },
  ) {
    return this.withdrawalsService.approveWithdrawal(id, req.user.sub, dto.adminNotes);
  }

  /**
   * Marcar como pagado
   */
  @Patch(':id/pay')
  async markAsPaid(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: PayWithdrawalDto,
  ) {
    return this.withdrawalsService.markAsPaid(id, req.user.sub, dto);
  }

  /**
   * Rechazar solicitud
   */
  @Patch(':id/reject')
  async rejectWithdrawal(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.withdrawalsService.rejectWithdrawal(id, req.user.sub, dto.rejectionReason);
  }
}
