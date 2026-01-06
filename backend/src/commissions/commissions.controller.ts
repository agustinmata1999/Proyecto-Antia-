import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CommissionsService, UpdateCommissionDto } from './commissions.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(
    private commissionsService: CommissionsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Verificar que el usuario es SuperAdmin
   */
  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo SuperAdmin puede acceder a esta función');
    }

    return user;
  }

  /**
   * GET /api/admin/commissions - Obtener todas las configuraciones de comisiones
   */
  @Get()
  async getAllCommissions(@Request() req) {
    await this.verifyAdmin(req.user.id);
    return this.commissionsService.getAllTipsterCommissions();
  }

  /**
   * GET /api/admin/commissions/:tipsterId - Obtener configuración de un tipster
   */
  @Get(':tipsterId')
  async getTipsterCommission(@Param('tipsterId') tipsterId: string, @Request() req) {
    await this.verifyAdmin(req.user.id);
    return this.commissionsService.getTipsterStats(tipsterId);
  }

  /**
   * GET /api/admin/commissions/:tipsterId/history - Obtener histórico de cambios
   */
  @Get(':tipsterId/history')
  async getCommissionHistory(@Param('tipsterId') tipsterId: string, @Request() req) {
    await this.verifyAdmin(req.user.id);
    const history = await this.commissionsService.getCommissionHistory(tipsterId);
    return { history };
  }

  /**
   * PATCH /api/admin/commissions/:tipsterId - Actualizar comisión de un tipster
   */
  @Patch(':tipsterId')
  async updateTipsterCommission(
    @Param('tipsterId') tipsterId: string,
    @Body() dto: UpdateCommissionDto,
    @Request() req,
  ) {
    const admin = await this.verifyAdmin(req.user.id);

    const updatedConfig = await this.commissionsService.updateTipsterCommission(
      tipsterId,
      dto,
      admin.id,
      admin.email,
    );

    return {
      success: true,
      message: 'Comisión actualizada correctamente',
      config: updatedConfig,
    };
  }
}
