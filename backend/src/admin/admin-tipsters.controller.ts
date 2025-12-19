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
import { PrismaService } from '../prisma/prisma.service';

interface UpdateModulesDto {
  moduleForecasts?: boolean;
  moduleAffiliate?: boolean;
}

@Controller('admin/tipsters')
@UseGuards(JwtAuthGuard)
export class AdminTipstersController {
  constructor(private prisma: PrismaService) {}

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
   * GET /api/admin/tipsters - Listar todos los tipsters con sus módulos
   */
  @Get()
  async getAllTipsters(@Request() req) {
    await this.verifyAdmin(req.user.id);

    // Get all tipster profiles with user info
    const result = await this.prisma.$runCommandRaw({
      aggregate: 'tipster_profiles',
      pipeline: [
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 1,
            user_id: 1,
            public_name: 1,
            telegram_username: 1,
            module_forecasts: 1,
            module_affiliate: 1,
            modules_updated_at: 1,
            created_at: 1,
            'user.email': 1,
            'user.status': 1,
          },
        },
        { $sort: { created_at: -1 } },
      ],
      cursor: {},
    }) as any;

    const tipsters = (result.cursor?.firstBatch || []).map((doc: any) => ({
      id: doc._id.$oid || doc._id.toString(),
      userId: doc.user_id,
      publicName: doc.public_name,
      telegramUsername: doc.telegram_username,
      email: doc.user?.email,
      status: doc.user?.status || 'ACTIVE',
      modules: {
        forecasts: doc.module_forecasts !== false, // default true
        affiliate: doc.module_affiliate === true,  // default false
      },
      modulesUpdatedAt: doc.modules_updated_at,
      createdAt: doc.created_at,
    }));

    return { tipsters };
  }

  /**
   * GET /api/admin/tipsters/:id - Obtener detalle de un tipster
   */
  @Get(':id')
  async getTipster(@Param('id') id: string, @Request() req) {
    await this.verifyAdmin(req.user.id);

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id },
    });

    if (!tipster) {
      throw new ForbiddenException('Tipster no encontrado');
    }

    // Get user info
    const userResult = await this.prisma.$runCommandRaw({
      find: 'users',
      filter: { _id: { $oid: tipster.userId } },
      limit: 1,
    }) as any;

    const user = userResult.cursor?.firstBatch?.[0];

    return {
      id: tipster.id,
      userId: tipster.userId,
      publicName: tipster.publicName,
      telegramUsername: tipster.telegramUsername,
      email: user?.email,
      status: user?.status || 'ACTIVE',
      modules: {
        forecasts: tipster.moduleForecasts !== false,
        affiliate: tipster.moduleAffiliate === true,
      },
      modulesUpdatedAt: tipster.modulesUpdatedAt,
      modulesUpdatedBy: tipster.modulesUpdatedBy,
      createdAt: tipster.createdAt,
    };
  }

  /**
   * PATCH /api/admin/tipsters/:id/modules - Actualizar módulos de un tipster
   */
  @Patch(':id/modules')
  async updateModules(
    @Param('id') id: string,
    @Body() dto: UpdateModulesDto,
    @Request() req,
  ) {
    const admin = await this.verifyAdmin(req.user.id);

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id },
    });

    if (!tipster) {
      throw new ForbiddenException('Tipster no encontrado');
    }

    // Update modules
    const now = new Date().toISOString();
    const updateData: any = {
      modules_updated_at: { $date: now },
      modules_updated_by: admin.id,
      updated_at: { $date: now },
    };

    if (dto.moduleForecasts !== undefined) {
      updateData.module_forecasts = dto.moduleForecasts;
    }
    if (dto.moduleAffiliate !== undefined) {
      updateData.module_affiliate = dto.moduleAffiliate;
    }

    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [{
        q: { _id: { $oid: id } },
        u: { $set: updateData },
      }],
    });

    // Get updated tipster
    const updated = await this.prisma.tipsterProfile.findUnique({
      where: { id },
    });

    return {
      success: true,
      message: 'Módulos actualizados correctamente',
      modules: {
        forecasts: updated?.moduleForecasts !== false,
        affiliate: updated?.moduleAffiliate === true,
      },
    };
  }
}
