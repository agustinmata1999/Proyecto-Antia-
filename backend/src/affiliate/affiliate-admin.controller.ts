import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AffiliateService } from './affiliate.service';
import {
  CreateBettingHouseDto,
  UpdateBettingHouseDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  MarkPayoutPaidDto,
  StandardCsvRow,
} from './dto';
import * as csv from 'csv-parse/sync';

@Controller('admin/affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateAdminController {
  constructor(
    private affiliateService: AffiliateService,
    private prisma: PrismaService,
  ) {}

  /**
   * Verify SuperAdmin access
   */
  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo SuperAdmin puede acceder a esta función');
    }
    return user;
  }

  // ==================== BETTING HOUSES ====================

  @Get('houses')
  async getAllHouses(@Request() req, @Query('includeInactive') includeInactive?: string) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.getAllBettingHouses(includeInactive === 'true');
  }

  @Get('houses/:id')
  async getHouse(@Param('id') id: string, @Request() req) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.getBettingHouse(id);
  }

  @Post('houses')
  async createHouse(@Body() dto: CreateBettingHouseDto, @Request() req) {
    const admin = await this.verifyAdmin(req.user.id);
    return this.affiliateService.createBettingHouse(dto, admin.id);
  }

  @Patch('houses/:id')
  async updateHouse(
    @Param('id') id: string,
    @Body() dto: UpdateBettingHouseDto,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.updateBettingHouse(id, dto);
  }

  // ==================== CAMPAIGNS ====================

  @Get('campaigns')
  async getAllCampaigns(@Request() req, @Query('includeInactive') includeInactive?: string) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.getAllCampaigns(includeInactive === 'true');
  }

  @Get('campaigns/:id')
  async getCampaign(@Param('id') id: string, @Request() req) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.getCampaign(id);
  }

  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto, @Request() req) {
    const admin = await this.verifyAdmin(req.user.id);
    return this.affiliateService.createCampaign(dto, admin.id);
  }

  @Patch('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.updateCampaign(id, dto);
  }

  // ==================== CSV IMPORT ====================

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('houseId') houseId: string,
    @Body('periodMonth') periodMonth: string,
    @Body('columnMapping') columnMappingStr: string,
    @Request() req,
  ) {
    const admin = await this.verifyAdmin(req.user.id);

    if (!file) {
      throw new BadRequestException('No se proporcionó archivo CSV');
    }

    if (!houseId || !periodMonth) {
      throw new BadRequestException('houseId y periodMonth son requeridos');
    }

    // Parse column mapping if provided
    let columnMapping: Record<string, string> | undefined;
    if (columnMappingStr) {
      try {
        columnMapping = JSON.parse(columnMappingStr);
      } catch {
        throw new BadRequestException('columnMapping debe ser un JSON válido');
      }
    }

    // Parse CSV
    const content = file.buffer.toString('utf-8');
    let records: any[];
    try {
      records = csv.parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error: any) {
      throw new BadRequestException('Error al parsear CSV: ' + error.message);
    }

    // Map columns to standard format
    const mapping = columnMapping || {
      tipster_tracking_id: 'tipster_tracking_id',
      event_type: 'event_type',
      status: 'status',
      occurred_at: 'occurred_at',
      external_ref_id: 'external_ref_id',
      amount: 'amount',
      currency: 'currency',
    };

    const standardRows: StandardCsvRow[] = records.map(row => ({
      tipster_tracking_id: row[mapping.tipster_tracking_id] || row.tipster_tracking_id || row.subid,
      event_type: (row[mapping.event_type] || row.event_type || 'REGISTER').toUpperCase(),
      status: (row[mapping.status] || row.status || 'PENDING').toUpperCase(),
      occurred_at: row[mapping.occurred_at] || row.occurred_at || row.date || new Date().toISOString(),
      external_ref_id: row[mapping.external_ref_id] || row.external_ref_id,
      amount: row[mapping.amount] ? parseFloat(row[mapping.amount]) : undefined,
      currency: row[mapping.currency] || row.currency || 'EUR',
    }));

    // Import
    return this.affiliateService.importCsv(
      houseId,
      periodMonth,
      standardRows,
      file.originalname,
      admin.id,
      columnMapping,
    );
  }

  @Get('import-batches')
  async getImportBatches(@Request() req, @Query('houseId') houseId?: string) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.getImportBatches(houseId);
  }

  // ==================== PAYOUTS ====================

  @Get('payouts')
  async getPayouts(
    @Request() req,
    @Query('tipsterId') tipsterId?: string,
    @Query('status') status?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    await this.verifyAdmin(req.user.id);
    return this.affiliateService.getPayouts({ tipsterId, status, periodMonth });
  }

  @Post('payouts/generate')
  async generatePayouts(@Body('periodMonth') periodMonth: string, @Request() req) {
    await this.verifyAdmin(req.user.id);
    
    if (!periodMonth) {
      throw new BadRequestException('periodMonth es requerido (formato: YYYY-MM)');
    }
    
    return this.affiliateService.generateMonthlyPayouts(periodMonth);
  }

  @Patch('payouts/:id/pay')
  async markPayoutPaid(
    @Param('id') id: string,
    @Body() dto: MarkPayoutPaidDto,
    @Request() req,
  ) {
    const admin = await this.verifyAdmin(req.user.id);
    return this.affiliateService.markPayoutPaid(id, dto, admin.id);
  }

  // ==================== CONVERSIONS (for viewing) ====================

  @Get('conversions')
  async getConversions(
    @Request() req,
    @Query('houseId') houseId?: string,
    @Query('tipsterId') tipsterId?: string,
    @Query('status') status?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    await this.verifyAdmin(req.user.id);

    const where: any = {};
    if (houseId) where.houseId = houseId;
    if (tipsterId) where.tipsterId = tipsterId;
    if (status) where.status = status;
    if (periodMonth) {
      where.occurredAt = {
        gte: new Date(`${periodMonth}-01`),
        lt: new Date(new Date(`${periodMonth}-01`).setMonth(new Date(`${periodMonth}-01`).getMonth() + 1)),
      };
    }

    const conversions = await this.prisma.affiliateConversion.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });

    // Enrich with house and tipster names
    const houseIds = [...new Set(conversions.map(c => c.houseId))];
    const tipsterIds = [...new Set(conversions.filter(c => c.tipsterId).map(c => c.tipsterId!))];

    const houses = await this.prisma.bettingHouse.findMany({ where: { id: { in: houseIds } } });
    const tipsters = await this.prisma.tipsterProfile.findMany({ where: { id: { in: tipsterIds } } });

    const housesMap = new Map(houses.map(h => [h.id, h.name]));
    const tipstersMap = new Map(tipsters.map(t => [t.id, t.publicName]));

    return conversions.map(c => ({
      ...c,
      houseName: housesMap.get(c.houseId) || 'Unknown',
      tipsterName: c.tipsterId ? tipstersMap.get(c.tipsterId) || 'Unknown' : 'Sin asignar',
      commissionEur: c.commissionCents ? c.commissionCents / 100 : null,
    }));
  }

  @Patch('conversions/:id/status')
  async updateConversionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('rejectionReason') rejectionReason?: string,
    @Request() req?: any,
  ) {
    await this.verifyAdmin(req.user.id);

    const conversion = await this.prisma.affiliateConversion.findUnique({ where: { id } });
    if (!conversion) {
      throw new BadRequestException('Conversión no encontrada');
    }

    // Get house for commission
    const house = await this.prisma.bettingHouse.findUnique({ where: { id: conversion.houseId } });

    const updateData: any = { status };
    
    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.commissionCents = house?.commissionPerReferralCents || 0;
      updateData.rejectionReason = null;
      
      // Update tipster link referral count using raw query
      if (conversion.tipsterId) {
        const linkResult = await this.prisma.$runCommandRaw({
          find: 'tipster_affiliate_links',
          filter: { tipster_id: conversion.tipsterId, house_id: conversion.houseId },
          limit: 1,
        }) as any;
        
        const linkDoc = linkResult.cursor?.firstBatch?.[0];
        if (linkDoc) {
          const linkId = linkDoc._id.$oid || linkDoc._id.toString();
          await this.prisma.$runCommandRaw({
            update: 'tipster_affiliate_links',
            updates: [{
              q: { _id: { $oid: linkId } },
              u: { $inc: { total_referrals: 1 } },
            }],
          });
        }
      }
    } else if (status === 'REJECTED') {
      updateData.rejectionReason = rejectionReason;
      updateData.commissionCents = null;
    }

    return this.prisma.affiliateConversion.update({
      where: { id },
      data: updateData,
    });
  }

  // ==================== REFERRALS (New Unified View) ====================

  @Get('referrals')
  async getReferrals(
    @Request() req,
    @Query('tipsterId') tipsterId?: string,
    @Query('houseId') houseId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.verifyAdmin(req.user.id);

    const filter: any = {};
    if (tipsterId) filter.tipster_id = tipsterId;
    if (houseId) filter.house_id = houseId;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.occurred_at = {};
      if (startDate) filter.occurred_at.$gte = { $date: new Date(startDate).toISOString() };
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.occurred_at.$lte = { $date: end.toISOString() };
      }
    }

    const conversionsResult = await this.prisma.$runCommandRaw({
      find: 'affiliate_conversions',
      filter,
      sort: { occurred_at: -1 },
      limit: 500,
    }) as any;

    const conversions = conversionsResult.cursor?.firstBatch || [];

    // Get all house and tipster IDs
    const houseIds = [...new Set(conversions.map((c: any) => c.house_id).filter(Boolean))];
    const tipsterIds = [...new Set(conversions.map((c: any) => c.tipster_id).filter(Boolean))];

    // Fetch houses
    let housesMap: Record<string, string> = {};
    if (houseIds.length > 0) {
      const housesResult = await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: { $in: houseIds.map((id: string) => ({ $oid: id })) } },
        projection: { name: 1 },
      }) as any;
      (housesResult.cursor?.firstBatch || []).forEach((h: any) => {
        housesMap[h._id.$oid || h._id] = h.name;
      });
    }

    // Fetch tipsters
    let tipstersMap: Record<string, string> = {};
    if (tipsterIds.length > 0) {
      const tipstersResult = await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $in: tipsterIds.map((id: string) => ({ $oid: id })) } },
        projection: { public_name: 1 },
      }) as any;
      (tipstersResult.cursor?.firstBatch || []).forEach((t: any) => {
        tipstersMap[t._id.$oid || t._id] = t.public_name;
      });
    }

    // Calculate stats
    const stats = {
      total: conversions.length,
      pending: conversions.filter((c: any) => c.status === 'PENDING').length,
      approved: conversions.filter((c: any) => c.status === 'APPROVED').length,
      rejected: conversions.filter((c: any) => c.status === 'REJECTED').length,
      totalCommissionCents: conversions
        .filter((c: any) => c.status === 'APPROVED')
        .reduce((sum: number, c: any) => sum + (c.commission_cents || 0), 0),
    };

    // Map referrals
    const referrals = conversions.map((c: any) => ({
      id: c._id.$oid || c._id,
      tipsterId: c.tipster_id,
      tipsterName: tipstersMap[c.tipster_id] || 'Sin asignar',
      houseId: c.house_id,
      houseName: housesMap[c.house_id] || 'Unknown',
      userId: c.user_id,
      userEmail: c.user_email,
      userTelegram: c.user_telegram,
      country: c.country,
      eventType: c.event_type,
      status: c.status,
      amountCents: c.amount_cents || 0,
      commissionCents: c.commission_cents || 0,
      clickedAt: c.clicked_at?.$date || c.clicked_at,
      convertedAt: c.occurred_at?.$date || c.occurred_at,
      externalRefId: c.external_ref_id,
    }));

    return { referrals, stats };
  }

  @Patch('referrals/:id/status')
  async updateReferralStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    return this.updateConversionStatus(id, status, undefined, req);
  }

  @Get('tipsters')
  async getTipsters(@Request() req) {
    await this.verifyAdmin(req.user.id);

    const tipstersResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: {},
      projection: { public_name: 1 },
    }) as any;

    const tipsters = (tipstersResult.cursor?.firstBatch || []).map((t: any) => ({
      id: t._id.$oid || t._id,
      name: t.public_name,
    }));

    return tipsters;
  }
}
