import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface ReviewApplicationDto {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
  notes?: string;
}

@Controller('admin/applications')
@UseGuards(JwtAuthGuard)
export class AdminApplicationsController {
  private readonly logger = new Logger(AdminApplicationsController.name);

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
   * GET /api/admin/applications/stats - Estadísticas de solicitudes
   */
  @Get('stats')
  async getApplicationStats(@Request() req) {
    await this.verifyAdmin(req.user.id);

    const result = await this.prisma.$runCommandRaw({
      aggregate: 'tipster_profiles',
      pipeline: [
        {
          $group: {
            _id: '$application_status',
            count: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    }) as any;

    const stats = (result.cursor?.firstBatch || []).reduce((acc: any, item: any) => {
      acc[item._id || 'UNKNOWN'] = item.count;
      return acc;
    }, {});

    return {
      pending: stats.PENDING || 0,
      approved: stats.APPROVED || 0,
      rejected: stats.REJECTED || 0,
      total: (stats.PENDING || 0) + (stats.APPROVED || 0) + (stats.REJECTED || 0),
    };
  }

  /**
   * GET /api/admin/applications - Listar solicitudes
   */
  @Get()
  async getApplications(@Query('status') status: string, @Request() req) {
    await this.verifyAdmin(req.user.id);

    const filterStatus = status || 'PENDING';

    const result = await this.prisma.$runCommandRaw({
      aggregate: 'tipster_profiles',
      pipeline: [
        {
          $match: {
            application_status: filterStatus,
          },
        },
        {
          $lookup: {
            from: 'users',
            let: { userId: '$user_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toString: '$_id' }, '$$userId'],
                  },
                },
              },
            ],
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
            application_status: 1,
            application_notes: 1,
            application_country: 1,
            application_experience: 1,
            application_social_media: 1,
            application_website: 1,
            rejection_reason: 1,
            reviewed_by: 1,
            reviewed_at: 1,
            created_at: 1,
            'user.email': 1,
            'user.phone': 1,
            'user.status': 1,
          },
        },
        { $sort: { created_at: -1 } },
      ],
      cursor: {},
    }) as any;

    const applications = (result.cursor?.firstBatch || []).map((doc: any) => ({
      id: doc._id.$oid || doc._id.toString(),
      tipsterProfileId: doc._id.$oid || doc._id.toString(),
      userId: doc.user_id,
      publicName: doc.public_name,
      telegramUsername: doc.telegram_username,
      email: doc.user?.email,
      phone: doc.user?.phone,
      userStatus: doc.user?.status,
      applicationStatus: doc.application_status || 'PENDING',
      applicationNotes: doc.application_notes,
      country: doc.application_country,
      experience: doc.application_experience,
      socialMedia: doc.application_social_media,
      website: doc.application_website,
      rejectionReason: doc.rejection_reason,
      reviewedBy: doc.reviewed_by,
      reviewedAt: doc.reviewed_at?.$date || doc.reviewed_at,
      createdAt: doc.created_at?.$date || doc.created_at,
    }));

    return { applications };
  }

  /**
   * GET /api/admin/applications/:id - Detalle de una solicitud
   */
  @Get(':id')
  async getApplicationDetail(@Param('id') id: string, @Request() req) {
    await this.verifyAdmin(req.user.id);

    const result = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { _id: { $oid: id } },
      limit: 1,
    }) as any;

    const profile = result.cursor?.firstBatch?.[0];

    if (!profile) {
      throw new ForbiddenException('Solicitud no encontrada');
    }

    // Get user info
    const userResult = await this.prisma.$runCommandRaw({
      find: 'users',
      filter: { _id: { $oid: profile.user_id } },
      limit: 1,
    }) as any;

    const user = userResult.cursor?.firstBatch?.[0];

    return {
      id: profile._id.$oid || profile._id,
      userId: profile.user_id,
      publicName: profile.public_name,
      telegramUsername: profile.telegram_username,
      email: user?.email,
      phone: user?.phone,
      userStatus: user?.status,
      applicationStatus: profile.application_status || 'PENDING',
      applicationNotes: profile.application_notes,
      country: profile.application_country,
      experience: profile.application_experience,
      socialMedia: profile.application_social_media,
      website: profile.application_website,
      rejectionReason: profile.rejection_reason,
      reviewedBy: profile.reviewed_by,
      reviewedAt: profile.reviewed_at?.$date || profile.reviewed_at,
      createdAt: profile.created_at?.$date || profile.created_at,
    };
  }

  /**
   * POST /api/admin/applications/:id/review - Aprobar o rechazar solicitud
   */
  @Post(':id/review')
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @Request() req,
  ) {
    const admin = await this.verifyAdmin(req.user.id);

    // Get tipster profile - try both ObjectId and string format
    let profileResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { _id: { $oid: id } },
      limit: 1,
    }) as any;
    
    // If not found with ObjectId, try as string
    if (!profileResult.cursor?.firstBatch?.[0]) {
      profileResult = await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: id },
        limit: 1,
      }) as any;
    }

    const profile = profileResult.cursor?.firstBatch?.[0];

    if (!profile) {
      throw new ForbiddenException('Solicitud no encontrada');
    }

    if (profile.application_status !== 'PENDING') {
      throw new ForbiddenException('Esta solicitud ya fue revisada');
    }

    const now = new Date().toISOString();
    const newStatus = dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const userStatus = dto.action === 'APPROVE' ? 'ACTIVE' : 'REJECTED';

    // Update tipster profile
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [{
        q: { _id: { $oid: id } },
        u: {
          $set: {
            application_status: newStatus,
            rejection_reason: dto.action === 'REJECT' ? dto.rejectionReason : null,
            reviewed_by: admin.id,
            reviewed_at: { $date: now },
            updated_at: { $date: now },
          },
        },
      }],
    });

    // Update user status
    await this.prisma.$runCommandRaw({
      update: 'users',
      updates: [{
        q: { _id: { $oid: profile.user_id } },
        u: {
          $set: {
            status: userStatus,
            updated_at: { $date: now },
          },
        },
      }],
    });

    this.logger.log(`Application ${id} ${dto.action}D by admin ${admin.email}`);

    return {
      success: true,
      message: dto.action === 'APPROVE' 
        ? 'Solicitud aprobada. El tipster ya puede acceder a la plataforma.'
        : 'Solicitud rechazada.',
      applicationStatus: newStatus,
      userStatus: userStatus,
    };
  }
}
