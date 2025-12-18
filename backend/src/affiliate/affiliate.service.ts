import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectId } from 'mongodb';
import {
  CreateBettingHouseDto,
  UpdateBettingHouseDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  StandardCsvRow,
  MarkPayoutPaidDto,
} from './dto';

@Injectable()
export class AffiliateService {
  constructor(private prisma: PrismaService) {}

  // ==================== BETTING HOUSES ====================

  async createBettingHouse(dto: CreateBettingHouseDto, adminId: string) {
    // Check slug is unique using raw query
    const existingResult = await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { slug: dto.slug.toLowerCase() },
      limit: 1,
    }) as any;

    if (existingResult.cursor?.firstBatch?.length > 0) {
      throw new BadRequestException(`Ya existe una casa con el slug "${dto.slug}"`);
    }

    const now = new Date().toISOString();
    const newId = new ObjectId();

    await this.prisma.$runCommandRaw({
      insert: 'betting_houses',
      documents: [{
        _id: newId,
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        logo_url: dto.logoUrl || null,
        status: 'ACTIVE',
        master_affiliate_url: dto.masterAffiliateUrl,
        tracking_param_name: dto.trackingParamName || 'subid',
        commission_per_referral_cents: dto.commissionPerReferralCents,
        allowed_countries: dto.allowedCountries || [],
        blocked_countries: dto.blockedCountries || [],
        csv_column_mapping: dto.csvColumnMapping || null,
        description: dto.description || null,
        website_url: dto.websiteUrl || null,
        created_by: adminId,
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
    });

    return {
      id: newId.toHexString(),
      name: dto.name,
      slug: dto.slug.toLowerCase(),
      logoUrl: dto.logoUrl,
      status: 'ACTIVE',
      masterAffiliateUrl: dto.masterAffiliateUrl,
      trackingParamName: dto.trackingParamName || 'subid',
      commissionPerReferralCents: dto.commissionPerReferralCents,
      commissionPerReferralEur: dto.commissionPerReferralCents / 100,
      allowedCountries: dto.allowedCountries || [],
      blockedCountries: dto.blockedCountries || [],
    };
  }

  async updateBettingHouse(id: string, dto: UpdateBettingHouseDto) {
    const house = await this.prisma.bettingHouse.findUnique({ where: { id } });
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    return this.prisma.bettingHouse.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.status && { status: dto.status }),
        ...(dto.masterAffiliateUrl && { masterAffiliateUrl: dto.masterAffiliateUrl }),
        ...(dto.trackingParamName && { trackingParamName: dto.trackingParamName }),
        ...(dto.commissionPerReferralCents !== undefined && { commissionPerReferralCents: dto.commissionPerReferralCents }),
        ...(dto.allowedCountries && { allowedCountries: dto.allowedCountries }),
        ...(dto.blockedCountries && { blockedCountries: dto.blockedCountries }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
        ...(dto.csvColumnMapping !== undefined && { csvColumnMapping: dto.csvColumnMapping }),
      },
    });
  }

  async getAllBettingHouses(includeInactive = false) {
    const where = includeInactive ? {} : { status: 'ACTIVE' };
    const houses = await this.prisma.bettingHouse.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    
    return houses.map(h => ({
      ...h,
      commissionPerReferralEur: h.commissionPerReferralCents / 100,
    }));
  }

  async getBettingHouse(id: string) {
    const house = await this.prisma.bettingHouse.findUnique({ where: { id } });
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }
    return {
      ...house,
      commissionPerReferralEur: house.commissionPerReferralCents / 100,
    };
  }

  async getBettingHouseBySlug(slug: string) {
    const house = await this.prisma.bettingHouse.findUnique({ where: { slug } });
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }
    return house;
  }

  // Filter houses by country
  async getHousesForCountry(countryCode: string) {
    const houses = await this.prisma.bettingHouse.findMany({
      where: { status: 'ACTIVE' },
    });

    return houses.filter(house => {
      // If allowedCountries is set and not empty, country must be in it
      if (house.allowedCountries.length > 0) {
        return house.allowedCountries.includes(countryCode);
      }
      // If blockedCountries is set, country must NOT be in it
      if (house.blockedCountries.length > 0) {
        return !house.blockedCountries.includes(countryCode);
      }
      // Default: allow all
      return true;
    }).map(h => ({
      ...h,
      commissionPerReferralEur: h.commissionPerReferralCents / 100,
    }));
  }

  // ==================== CAMPAIGNS ====================

  async createCampaign(dto: CreateCampaignDto, adminId: string) {
    const existing = await this.prisma.affiliateCampaign.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe una campaña con el slug "${dto.slug}"`);
    }

    return this.prisma.affiliateCampaign.create({
      data: {
        name: dto.name,
        slug: dto.slug.toLowerCase(),
        description: dto.description,
        houseIds: dto.houseIds,
        targetCountries: dto.targetCountries || [],
        startDate: dto.startDate,
        endDate: dto.endDate,
        createdBy: adminId,
      },
    });
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.affiliateCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada');
    }

    return this.prisma.affiliateCampaign.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.houseIds && { houseIds: dto.houseIds }),
        ...(dto.targetCountries && { targetCountries: dto.targetCountries }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      },
    });
  }

  async getAllCampaigns(includeInactive = false) {
    const where = includeInactive ? {} : { status: 'ACTIVE' };
    const campaigns = await this.prisma.affiliateCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with house details
    const allHouses = await this.prisma.bettingHouse.findMany();
    const housesMap = new Map(allHouses.map(h => [h.id, h]));

    return campaigns.map(c => ({
      ...c,
      houses: c.houseIds.map(id => housesMap.get(id)).filter(Boolean),
    }));
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.affiliateCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada');
    }

    const houses = await this.prisma.bettingHouse.findMany({
      where: { id: { in: campaign.houseIds } },
    });

    return { ...campaign, houses };
  }

  // ==================== TIPSTER LINKS ====================

  async getOrCreateTipsterLink(tipsterId: string, houseId: string) {
    // Check if link exists
    let link = await this.prisma.tipsterAffiliateLink.findUnique({
      where: { tipsterId_houseId: { tipsterId, houseId } },
    });

    if (!link) {
      // Create new link with unique redirect code
      const house = await this.prisma.bettingHouse.findUnique({ where: { id: houseId } });
      if (!house) {
        throw new NotFoundException('Casa de apuestas no encontrada');
      }

      const redirectCode = `${tipsterId.slice(-6)}-${house.slug}`;
      
      link = await this.prisma.tipsterAffiliateLink.create({
        data: {
          tipsterId,
          houseId,
          redirectCode,
        },
      });
    }

    return link;
  }

  async getTipsterLinks(tipsterId: string) {
    const links = await this.prisma.tipsterAffiliateLink.findMany({
      where: { tipsterId },
    });

    // Enrich with house details
    const houseIds = links.map(l => l.houseId);
    const houses = await this.prisma.bettingHouse.findMany({
      where: { id: { in: houseIds } },
    });
    const housesMap = new Map(houses.map(h => [h.id, h]));

    return links.map(link => {
      const house = housesMap.get(link.houseId);
      return {
        ...link,
        house: house ? {
          id: house.id,
          name: house.name,
          slug: house.slug,
          logoUrl: house.logoUrl,
          commissionPerReferralEur: house.commissionPerReferralCents / 100,
        } : null,
      };
    });
  }

  async getTipsterHousesWithLinks(tipsterId: string, countryCode?: string) {
    // Get all active houses (optionally filtered by country)
    let houses = await this.prisma.bettingHouse.findMany({
      where: { status: 'ACTIVE' },
    });

    if (countryCode) {
      houses = houses.filter(house => {
        if (house.allowedCountries.length > 0) {
          return house.allowedCountries.includes(countryCode);
        }
        if (house.blockedCountries.length > 0) {
          return !house.blockedCountries.includes(countryCode);
        }
        return true;
      });
    }

    // Get or create links for each house
    const result = [];
    for (const house of houses) {
      const link = await this.getOrCreateTipsterLink(tipsterId, house.id);
      
      result.push({
        house: {
          id: house.id,
          name: house.name,
          slug: house.slug,
          logoUrl: house.logoUrl,
          commissionPerReferralEur: house.commissionPerReferralCents / 100,
        },
        link: {
          id: link.id,
          redirectCode: link.redirectCode,
          totalClicks: link.totalClicks,
          totalReferrals: link.totalReferrals,
        },
      });
    }

    return result;
  }

  // ==================== CLICK TRACKING ====================

  async recordClick(
    tipsterId: string,
    houseId: string,
    ipAddress?: string,
    countryCode?: string,
    userAgent?: string,
    referer?: string,
  ) {
    const house = await this.prisma.bettingHouse.findUnique({ where: { id: houseId } });
    if (!house || house.status !== 'ACTIVE') {
      throw new NotFoundException('Casa de apuestas no encontrada o inactiva');
    }

    // Check if country is allowed
    let wasBlocked = false;
    let blockReason: string | null = null;

    if (countryCode) {
      if (house.allowedCountries.length > 0 && !house.allowedCountries.includes(countryCode)) {
        wasBlocked = true;
        blockReason = `País ${countryCode} no está en la lista de países permitidos`;
      } else if (house.blockedCountries.includes(countryCode)) {
        wasBlocked = true;
        blockReason = `País ${countryCode} está bloqueado para esta casa`;
      }
    }

    // Build redirect URL with tracking param
    let redirectedTo: string | null = null;
    if (!wasBlocked) {
      const url = new URL(house.masterAffiliateUrl);
      url.searchParams.set(house.trackingParamName, tipsterId);
      redirectedTo = url.toString();
    }

    // Get link
    const link = await this.getOrCreateTipsterLink(tipsterId, houseId);

    // Record click event
    const clickEvent = await this.prisma.affiliateClickEvent.create({
      data: {
        tipsterId,
        houseId,
        linkId: link.id,
        ipAddress,
        countryCode,
        userAgent,
        referer,
        wasBlocked,
        blockReason,
        redirectedTo,
      },
    });

    // Update click count on link
    if (!wasBlocked) {
      await this.prisma.tipsterAffiliateLink.update({
        where: { id: link.id },
        data: { totalClicks: { increment: 1 } },
      });
    }

    return {
      success: !wasBlocked,
      wasBlocked,
      blockReason,
      redirectUrl: redirectedTo,
      house: {
        name: house.name,
        slug: house.slug,
      },
    };
  }

  // ==================== CSV IMPORT ====================

  async importCsv(
    houseId: string,
    periodMonth: string,
    rows: StandardCsvRow[],
    fileName: string,
    adminId: string,
    customMapping?: Record<string, string>,
  ) {
    const house = await this.prisma.bettingHouse.findUnique({ where: { id: houseId } });
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    // Create import batch
    const batch = await this.prisma.affiliateImportBatch.create({
      data: {
        houseId,
        periodMonth,
        fileName,
        totalRows: rows.length,
        columnMapping: customMapping || house.csvColumnMapping,
        importedBy: adminId,
      },
    });

    let processedRows = 0;
    let errorRows = 0;
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Find tipster by tracking ID (subid)
        const tipsterLink = await this.prisma.tipsterAffiliateLink.findFirst({
          where: {
            houseId,
            OR: [
              { tipsterId: row.tipster_tracking_id },
              { redirectCode: { contains: row.tipster_tracking_id } },
            ],
          },
        });

        const tipsterId = tipsterLink?.tipsterId || null;

        // Create conversion record
        await this.prisma.affiliateConversion.create({
          data: {
            houseId,
            tipsterId,
            externalRefId: row.external_ref_id,
            tipsterTrackingId: row.tipster_tracking_id,
            eventType: row.event_type,
            status: row.status,
            amountCents: row.amount ? Math.round(row.amount * 100) : null,
            currency: row.currency,
            occurredAt: new Date(row.occurred_at),
            importBatchId: batch.id,
            rawData: row as any,
            // If approved, calculate commission
            commissionCents: row.status === 'APPROVED' ? house.commissionPerReferralCents : null,
            approvedAt: row.status === 'APPROVED' ? new Date() : null,
          },
        });

        // If approved and tipster found, update referral count
        if (row.status === 'APPROVED' && tipsterLink) {
          await this.prisma.tipsterAffiliateLink.update({
            where: { id: tipsterLink.id },
            data: { totalReferrals: { increment: 1 } },
          });
        }

        processedRows++;
      } catch (error: any) {
        errorRows++;
        errors.push({ row: i + 1, error: error.message });
      }
    }

    // Update batch status
    await this.prisma.affiliateImportBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        processedRows,
        errorRows,
        errors: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      },
    });

    return {
      batchId: batch.id,
      totalRows: rows.length,
      processedRows,
      errorRows,
      errors: errors.slice(0, 10), // Return first 10 errors
    };
  }

  async getImportBatches(houseId?: string) {
    const where = houseId ? { houseId } : {};
    const batches = await this.prisma.affiliateImportBatch.findMany({
      where,
      orderBy: { importedAt: 'desc' },
      take: 50,
    });

    // Enrich with house names
    const houseIds = [...new Set(batches.map(b => b.houseId))];
    const houses = await this.prisma.bettingHouse.findMany({
      where: { id: { in: houseIds } },
    });
    const housesMap = new Map(houses.map(h => [h.id, h.name]));

    return batches.map(b => ({
      ...b,
      houseName: housesMap.get(b.houseId) || 'Unknown',
    }));
  }

  // ==================== TIPSTER METRICS ====================

  async getTipsterAffiliateMetrics(tipsterId: string) {
    // Get conversions
    const conversions = await this.prisma.affiliateConversion.findMany({
      where: { tipsterId },
    });

    // Get clicks
    const clicks = await this.prisma.affiliateClickEvent.count({
      where: { tipsterId, wasBlocked: false },
    });

    // Group by house
    const houses = await this.prisma.bettingHouse.findMany();
    const housesMap = new Map(houses.map(h => [h.id, h]));

    const byHouse: Record<string, any> = {};
    for (const conv of conversions) {
      if (!byHouse[conv.houseId]) {
        const house = housesMap.get(conv.houseId);
        byHouse[conv.houseId] = {
          houseId: conv.houseId,
          houseName: house?.name || 'Unknown',
          pending: 0,
          approved: 0,
          rejected: 0,
          totalEarningsCents: 0,
        };
      }
      if (conv.status === 'PENDING') byHouse[conv.houseId].pending++;
      if (conv.status === 'APPROVED') {
        byHouse[conv.houseId].approved++;
        byHouse[conv.houseId].totalEarningsCents += conv.commissionCents || 0;
      }
      if (conv.status === 'REJECTED') byHouse[conv.houseId].rejected++;
    }

    const totalPending = conversions.filter(c => c.status === 'PENDING').length;
    const totalApproved = conversions.filter(c => c.status === 'APPROVED').length;
    const totalRejected = conversions.filter(c => c.status === 'REJECTED').length;
    const totalEarningsCents = conversions
      .filter(c => c.status === 'APPROVED')
      .reduce((sum, c) => sum + (c.commissionCents || 0), 0);

    return {
      clicks,
      referrals: {
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected,
        total: conversions.length,
      },
      earnings: {
        totalCents: totalEarningsCents,
        totalEur: totalEarningsCents / 100,
      },
      byHouse: Object.values(byHouse),
    };
  }

  // ==================== PAYOUTS ====================

  async generateMonthlyPayouts(periodMonth: string) {
    // Get all approved conversions for the period that haven't been paid
    const conversions = await this.prisma.affiliateConversion.findMany({
      where: {
        status: 'APPROVED',
        occurredAt: {
          gte: new Date(`${periodMonth}-01`),
          lt: new Date(new Date(`${periodMonth}-01`).setMonth(new Date(`${periodMonth}-01`).getMonth() + 1)),
        },
      },
    });

    // Group by tipster
    const byTipster: Record<string, any[]> = {};
    for (const conv of conversions) {
      if (!conv.tipsterId) continue;
      if (!byTipster[conv.tipsterId]) byTipster[conv.tipsterId] = [];
      byTipster[conv.tipsterId].push(conv);
    }

    const houses = await this.prisma.bettingHouse.findMany();
    const housesMap = new Map(houses.map(h => [h.id, h]));

    const payouts = [];
    for (const [tipsterId, tipsterConvs] of Object.entries(byTipster)) {
      // Check if payout already exists
      const existing = await this.prisma.affiliatePayout.findUnique({
        where: { tipsterId_periodMonth: { tipsterId, periodMonth } },
      });
      if (existing) continue;

      // Build house breakdown
      const breakdown: Record<string, any> = {};
      for (const conv of tipsterConvs) {
        if (!breakdown[conv.houseId]) {
          const house = housesMap.get(conv.houseId);
          breakdown[conv.houseId] = {
            houseId: conv.houseId,
            houseName: house?.name || 'Unknown',
            referrals: 0,
            amountCents: 0,
          };
        }
        breakdown[conv.houseId].referrals++;
        breakdown[conv.houseId].amountCents += conv.commissionCents || 0;
      }

      const totalReferrals = tipsterConvs.length;
      const totalAmountCents = tipsterConvs.reduce((sum, c) => sum + (c.commissionCents || 0), 0);

      const payout = await this.prisma.affiliatePayout.create({
        data: {
          tipsterId,
          periodMonth,
          houseBreakdown: Object.values(breakdown),
          totalReferrals,
          totalAmountCents,
        },
      });

      payouts.push(payout);
    }

    return payouts;
  }

  async getPayouts(filters?: { tipsterId?: string; status?: string; periodMonth?: string }) {
    const where: any = {};
    if (filters?.tipsterId) where.tipsterId = filters.tipsterId;
    if (filters?.status) where.status = filters.status;
    if (filters?.periodMonth) where.periodMonth = filters.periodMonth;

    const payouts = await this.prisma.affiliatePayout.findMany({
      where,
      orderBy: { periodMonth: 'desc' },
    });

    // Enrich with tipster names
    const tipsterIds = [...new Set(payouts.map(p => p.tipsterId))];
    const tipsters = await this.prisma.tipsterProfile.findMany({
      where: { id: { in: tipsterIds } },
    });
    const tipstersMap = new Map(tipsters.map(t => [t.id, t.publicName]));

    return payouts.map(p => ({
      ...p,
      tipsterName: tipstersMap.get(p.tipsterId) || 'Unknown',
      totalAmountEur: p.totalAmountCents / 100,
    }));
  }

  async getTipsterPayouts(tipsterId: string) {
    return this.prisma.affiliatePayout.findMany({
      where: { tipsterId },
      orderBy: { periodMonth: 'desc' },
    });
  }

  async markPayoutPaid(payoutId: string, dto: MarkPayoutPaidDto, adminId: string) {
    const payout = await this.prisma.affiliatePayout.findUnique({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException('Liquidación no encontrada');
    }

    return this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidBy: adminId,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        notes: dto.notes,
      },
    });
  }
}
