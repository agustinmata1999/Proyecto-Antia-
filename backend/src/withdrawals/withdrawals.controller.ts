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
import { CreateWithdrawalDto, PayWithdrawalDto, RejectWithdrawalDto, ApproveWithdrawalDto } from './dto/withdrawals.dto';

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
    const userId = req.user.id || req.user.sub;
    return this.withdrawalsService.getAvailableBalance(userId);
  }

  /**
   * Crear solicitud de retiro
   */
  @Post('request')
  @UseGuards(RolesGuard)
  @Roles('TIPSTER')
  async createRequest(@Request() req, @Body() dto: CreateWithdrawalDto) {
    const userId = req.user.id || req.user.sub;
    return this.withdrawalsService.createWithdrawalRequest(userId, dto);
  }

  /**
   * Obtener mis solicitudes de retiro
   */
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles('TIPSTER')
  async getMyWithdrawals(@Request() req) {
    const userId = req.user.id || req.user.sub;
    const withdrawals = await this.withdrawalsService.getTipsterWithdrawals(userId);
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
    @Body() dto: ApproveWithdrawalDto,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.withdrawalsService.approveWithdrawal(id, adminId, dto.adminNotes);
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
    const adminId = req.user.id || req.user.sub;
    return this.withdrawalsService.markAsPaid(id, adminId, dto);
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
    const adminId = req.user.id || req.user.sub;
    return this.withdrawalsService.rejectWithdrawal(id, adminId, dto.rejectionReason);
  }
}
