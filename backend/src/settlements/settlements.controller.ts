import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SettlementsService } from './settlements.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(
    private settlementsService: SettlementsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Obtener el tipsterId del usuario autenticado
   */
  private async getTipsterId(userId: string): Promise<string | null> {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
    });
    return tipsterProfile?.id || null;
  }

  /**
   * GET /api/settlements - Obtener resumen de liquidaciones del tipster
   */
  @Get()
  async getSettlements(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    if (!tipsterId) {
      return { error: 'Perfil de tipster no encontrado' };
    }
    return this.settlementsService.getDetailedBreakdown(tipsterId);
  }

  /**
   * GET /api/settlements/pending - Obtener liquidaciones pendientes
   */
  @Get('pending')
  async getPendingSettlements(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    if (!tipsterId) {
      return { error: 'Perfil de tipster no encontrado' };
    }
    return this.settlementsService.getPendingSummary(tipsterId);
  }

  /**
   * GET /api/settlements/history - Obtener historial de liquidaciones
   */
  @Get('history')
  async getSettlementHistory(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    if (!tipsterId) {
      return { history: [] };
    }
    const history = await this.settlementsService.getSettlementHistory(tipsterId);
    return { history };
  }

  /**
   * GET /api/settlements/total-paid - Obtener total liquidado
   */
  @Get('total-paid')
  async getTotalPaid(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    if (!tipsterId) {
      return { totalPaidOutCents: 0, settlementCount: 0 };
    }
    return this.settlementsService.getTotalPaidOut(tipsterId);
  }
}
