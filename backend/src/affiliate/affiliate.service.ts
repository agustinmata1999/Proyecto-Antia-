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
    const existingResult = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { slug: dto.slug.toLowerCase() },
      limit: 1,
    })) as any;

    if (existingResult.cursor?.firstBatch?.length > 0) {
      throw new BadRequestException(`Ya existe una casa con el slug "${dto.slug}"`);
    }

    const now = new Date().toISOString();
    const newId = new ObjectId();

    await this.prisma.$runCommandRaw({
      insert: 'betting_houses',
      documents: [
        {
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
        },
      ],
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
    // Check house exists - try string ID first, then ObjectId
    let houseResult = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { _id: id },
      limit: 1,
    })) as any;

    if (!houseResult.cursor?.firstBatch?.length) {
      // Try as ObjectId
      houseResult = (await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: { $oid: id } },
        limit: 1,
      })) as any;
    }

    if (!houseResult.cursor?.firstBatch?.length) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    const now = new Date().toISOString();
    const updateFields: any = { updated_at: { $date: now } };

    if (dto.name) updateFields.name = dto.name;
    if (dto.slug) updateFields.slug = dto.slug;
    if (dto.logoUrl !== undefined) updateFields.logo_url = dto.logoUrl;
    if (dto.status) updateFields.status = dto.status;
    if (dto.masterAffiliateUrl) updateFields.master_affiliate_url = dto.masterAffiliateUrl;
    if (dto.trackingParamName !== undefined)
      updateFields.tracking_param_name = dto.trackingParamName;
    if (dto.commissionPerReferralCents !== undefined)
      updateFields.commission_per_referral_cents = dto.commissionPerReferralCents;
    // Arrays can be empty, so check for undefined instead of truthy
    if (dto.allowedCountries !== undefined) updateFields.allowed_countries = dto.allowedCountries;
    if (dto.blockedCountries !== undefined) updateFields.blocked_countries = dto.blockedCountries;
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.websiteUrl !== undefined) updateFields.website_url = dto.websiteUrl;
    if (dto.csvColumnMapping !== undefined) updateFields.csv_column_mapping = dto.csvColumnMapping;

    // Try update with string ID first
    await this.prisma.$runCommandRaw({
      findAndModify: 'betting_houses',
      query: { _id: id },
      update: { $set: updateFields },
    });

    return this.getBettingHouse(id);
  }

  async getAllBettingHouses(includeInactive = false) {
    const filter = includeInactive ? {} : { status: 'ACTIVE' };
    const result = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter,
      sort: { name: 1 },
    })) as any;

    const houses = result.cursor?.firstBatch || [];
    return houses.map((h: any) => {
      const houseId = h._id.$oid || h._id.toString?.() || h._id;
      return {
        id: houseId,
        name: h.name,
        slug: h.slug,
        logoUrl: h.logo_url,
        status: h.status,
        masterAffiliateUrl: h.master_affiliate_url,
        trackingParamName: h.tracking_param_name,
        commissionPerReferralCents: h.commission_per_referral_cents,
        commissionPerReferralEur: h.commission_per_referral_cents / 100,
        allowedCountries: h.allowed_countries || [],
        blockedCountries: h.blocked_countries || [],
        description: h.description,
        websiteUrl: h.website_url,
        createdAt: h.created_at,
      };
    });
  }

  async getBettingHouse(id: string) {
    // Try to find by _id as ObjectId or as string
    let result = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { _id: { $oid: id } },
      limit: 1,
    })) as any;

    let house = result.cursor?.firstBatch?.[0];

    // If not found with $oid, try as string
    if (!house) {
      result = (await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: id },
        limit: 1,
      })) as any;
      house = result.cursor?.firstBatch?.[0];
    }

    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    const houseId = house._id.$oid || house._id.toString?.() || house._id;

    return {
      id: houseId,
      name: house.name,
      slug: house.slug,
      logoUrl: house.logo_url,
      status: house.status,
      masterAffiliateUrl: house.master_affiliate_url,
      trackingParamName: house.tracking_param_name,
      commissionPerReferralCents: house.commission_per_referral_cents,
      commissionPerReferralEur: house.commission_per_referral_cents / 100,
      allowedCountries: house.allowed_countries || [],
      blockedCountries: house.blocked_countries || [],
      description: house.description,
      websiteUrl: house.website_url,
    };
  }

  async getBettingHouseBySlug(slug: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { slug: slug.toLowerCase() },
      limit: 1,
    })) as any;

    const house = result.cursor?.firstBatch?.[0];
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    return {
      id: house._id.$oid || house._id.toString(),
      name: house.name,
      slug: house.slug,
      logoUrl: house.logo_url,
      status: house.status,
      masterAffiliateUrl: house.master_affiliate_url,
      trackingParamName: house.tracking_param_name,
      commissionPerReferralCents: house.commission_per_referral_cents,
      allowedCountries: house.allowed_countries || [],
      blockedCountries: house.blocked_countries || [],
    };
  }

  // Filter houses by country
  async getHousesForCountry(countryCode: string) {
    const allHouses = await this.getAllBettingHouses(false);

    return allHouses.filter((house) => {
      if (house.allowedCountries.length > 0) {
        return house.allowedCountries.includes(countryCode);
      }
      if (house.blockedCountries.length > 0) {
        return !house.blockedCountries.includes(countryCode);
      }
      return true;
    });
  }

  // ==================== CAMPAIGNS ====================

  async createCampaign(dto: CreateCampaignDto, adminId: string) {
    const existingResult = (await this.prisma.$runCommandRaw({
      find: 'affiliate_campaigns',
      filter: { slug: dto.slug.toLowerCase() },
      limit: 1,
    })) as any;

    if (existingResult.cursor?.firstBatch?.length > 0) {
      throw new BadRequestException(`Ya existe una campaña con el slug "${dto.slug}"`);
    }

    const now = new Date().toISOString();
    const newId = new ObjectId();

    await this.prisma.$runCommandRaw({
      insert: 'affiliate_campaigns',
      documents: [
        {
          _id: newId,
          name: dto.name,
          slug: dto.slug.toLowerCase(),
          description: dto.description || null,
          status: 'ACTIVE',
          house_ids: dto.houseIds,
          target_countries: dto.targetCountries || [],
          start_date: dto.startDate ? { $date: dto.startDate.toISOString() } : null,
          end_date: dto.endDate ? { $date: dto.endDate.toISOString() } : null,
          created_by: adminId,
          created_at: { $date: now },
          updated_at: { $date: now },
        },
      ],
    });

    return {
      id: newId.toHexString(),
      name: dto.name,
      slug: dto.slug.toLowerCase(),
      status: 'ACTIVE',
      houseIds: dto.houseIds,
    };
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaignResult = (await this.prisma.$runCommandRaw({
      find: 'affiliate_campaigns',
      filter: { _id: { $oid: id } },
      limit: 1,
    })) as any;

    if (!campaignResult.cursor?.firstBatch?.length) {
      throw new NotFoundException('Campaña no encontrada');
    }

    const now = new Date().toISOString();
    const updateFields: any = { updated_at: { $date: now } };

    if (dto.name) updateFields.name = dto.name;
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.status) updateFields.status = dto.status;
    if (dto.houseIds) updateFields.house_ids = dto.houseIds;
    if (dto.targetCountries) updateFields.target_countries = dto.targetCountries;

    await this.prisma.$runCommandRaw({
      update: 'affiliate_campaigns',
      updates: [
        {
          q: { _id: { $oid: id } },
          u: { $set: updateFields },
        },
      ],
    });

    return this.getCampaign(id);
  }

  async getAllCampaigns(includeInactive = false) {
    const filter = includeInactive ? {} : { status: 'ACTIVE' };
    const result = (await this.prisma.$runCommandRaw({
      find: 'affiliate_campaigns',
      filter,
      sort: { created_at: -1 },
    })) as any;

    const campaigns = result.cursor?.firstBatch || [];
    const allHouses = await this.getAllBettingHouses(true);
    const housesMap = new Map(allHouses.map((h) => [h.id, h]));

    return campaigns.map((c: any) => ({
      id: c._id.$oid || c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      status: c.status,
      houseIds: c.house_ids || [],
      targetCountries: c.target_countries || [],
      houses: (c.house_ids || []).map((id: string) => housesMap.get(id)).filter(Boolean),
      createdAt: c.created_at,
    }));
  }

  async getCampaign(id: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'affiliate_campaigns',
      filter: { _id: { $oid: id } },
      limit: 1,
    })) as any;

    const campaign = result.cursor?.firstBatch?.[0];
    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada');
    }

    const houses = await this.getAllBettingHouses(true);
    const houseIds = campaign.house_ids || [];

    return {
      id: campaign._id.$oid || campaign._id.toString(),
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      status: campaign.status,
      houseIds,
      targetCountries: campaign.target_countries || [],
      houses: houses.filter((h) => houseIds.includes(h.id)),
    };
  }

  // ==================== TIPSTER LINKS ====================

  async getOrCreateTipsterLink(tipsterId: string, houseId: string) {
    // Check if link exists
    const existingResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_links',
      filter: { tipster_id: tipsterId, house_id: houseId },
      limit: 1,
    })) as any;

    let linkDoc = existingResult.cursor?.firstBatch?.[0];

    if (!linkDoc) {
      // Get house for slug
      const house = await this.getBettingHouse(houseId);

      const now = new Date().toISOString();
      const newId = new ObjectId();
      const redirectCode = `${tipsterId.slice(-6)}-${house.slug}`;

      await this.prisma.$runCommandRaw({
        insert: 'tipster_affiliate_links',
        documents: [
          {
            _id: newId,
            tipster_id: tipsterId,
            house_id: houseId,
            redirect_code: redirectCode,
            total_clicks: 0,
            total_referrals: 0,
            status: 'ACTIVE',
            created_at: { $date: now },
            updated_at: { $date: now },
          },
        ],
      });

      linkDoc = {
        _id: newId,
        tipster_id: tipsterId,
        house_id: houseId,
        redirect_code: redirectCode,
        total_clicks: 0,
        total_referrals: 0,
        status: 'ACTIVE',
      };
    }

    return {
      id: linkDoc._id.$oid || linkDoc._id.toHexString?.() || linkDoc._id.toString(),
      tipsterId: linkDoc.tipster_id,
      houseId: linkDoc.house_id,
      redirectCode: linkDoc.redirect_code,
      totalClicks: linkDoc.total_clicks || 0,
      totalReferrals: linkDoc.total_referrals || 0,
      status: linkDoc.status || 'ACTIVE',
    };
  }

  async getTipsterLinks(tipsterId: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_links',
      filter: { tipster_id: tipsterId },
    })) as any;

    const links = result.cursor?.firstBatch || [];

    // Enrich with house details
    const houseIds = links.map((l: any) => l.house_id);
    const allHouses = await this.getAllBettingHouses(true);
    const housesMap = new Map(allHouses.map((h) => [h.id, h]));

    return links.map((link: any) => {
      const house = housesMap.get(link.house_id) as any;
      return {
        id: link._id.$oid || link._id.toString(),
        tipsterId: link.tipster_id,
        houseId: link.house_id,
        redirectCode: link.redirect_code,
        totalClicks: link.total_clicks || 0,
        totalReferrals: link.total_referrals || 0,
        house: house
          ? {
              id: house.id,
              name: house.name,
              slug: house.slug,
              logoUrl: house.logoUrl,
              commissionPerReferralEur: house.commissionPerReferralEur,
            }
          : null,
      };
    });
  }

  async getTipsterHousesWithLinks(tipsterId: string, countryCode?: string) {
    // Get all active houses (optionally filtered by country)
    let houses = await this.getAllBettingHouses(false);

    if (countryCode) {
      houses = houses.filter((house) => {
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
          commissionPerReferralEur: house.commissionPerReferralEur,
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
    const house = await this.getBettingHouse(houseId);
    if (house.status !== 'ACTIVE') {
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
      // Special handling for simulator house
      if (house.slug === 'simulator' || house.masterAffiliateUrl === 'INTERNAL_SIMULATOR') {
        // Redirect to internal simulator
        const appUrl = process.env.APP_URL || 'http://localhost:8001';
        redirectedTo = `${appUrl}/api/simulator/landing?subid=${tipsterId}&affiliate=antia`;
      } else {
        const url = new URL(house.masterAffiliateUrl);
        url.searchParams.set(house.trackingParamName, tipsterId);
        redirectedTo = url.toString();
      }
    }

    // Get link
    const link = await this.getOrCreateTipsterLink(tipsterId, houseId);

    // Record click event using raw MongoDB
    const now = new Date().toISOString();
    const clickId = new ObjectId();

    await this.prisma.$runCommandRaw({
      insert: 'affiliate_click_events',
      documents: [
        {
          _id: clickId,
          tipster_id: tipsterId,
          house_id: houseId,
          link_id: link.id,
          ip_address: ipAddress || null,
          country_code: countryCode || null,
          user_agent: userAgent || null,
          referer: referer || null,
          was_blocked: wasBlocked,
          block_reason: blockReason,
          redirected_to: redirectedTo,
          clicked_at: { $date: now },
          created_at: { $date: now },
        },
      ],
    });

    // Update click count on link
    if (!wasBlocked) {
      await this.prisma.$runCommandRaw({
        update: 'tipster_affiliate_links',
        updates: [
          {
            q: { _id: { $oid: link.id } },
            u: { $inc: { total_clicks: 1 } },
          },
        ],
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
    const houseIds = [...new Set(batches.map((b) => b.houseId))];
    const houses = await this.prisma.bettingHouse.findMany({
      where: { id: { in: houseIds } },
    });
    const housesMap = new Map(houses.map((h) => [h.id, h.name]));

    return batches.map((b) => ({
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
    const housesMap = new Map(houses.map((h) => [h.id, h]));

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

    const totalPending = conversions.filter((c) => c.status === 'PENDING').length;
    const totalApproved = conversions.filter((c) => c.status === 'APPROVED').length;
    const totalRejected = conversions.filter((c) => c.status === 'REJECTED').length;
    const totalEarningsCents = conversions
      .filter((c) => c.status === 'APPROVED')
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

  // ==================== TIPSTER REFERRALS ====================

  async getTipsterReferrals(
    tipsterId: string,
    filters?: { houseId?: string; status?: string; startDate?: string; endDate?: string },
  ) {
    // Build where clause
    const where: any = { tipsterId };

    if (filters?.houseId) {
      where.houseId = filters.houseId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      where.occurredAt = {};
      if (filters.startDate) {
        where.occurredAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.occurredAt.lte = new Date(filters.endDate);
      }
    }

    // Get conversions
    const conversions = await this.prisma.affiliateConversion.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 500, // Limit for performance
    });

    // Get houses for names
    const houses = await this.prisma.bettingHouse.findMany();
    const housesMap = new Map(houses.map((h) => [h.id, h]));

    // Map to response format
    const referrals = conversions.map((conv) => {
      const house = housesMap.get(conv.houseId);
      return {
        id: conv.id,
        houseId: conv.houseId,
        houseName: house?.name || 'Desconocido',
        houseSlug: house?.slug || '',
        houseLogoUrl: house?.logoUrl || null,
        userName: conv.userEmail?.split('@')[0] || conv.userTelegram || 'Usuario',
        userEmail: conv.userEmail || null,
        userTelegram: conv.userTelegram || null,
        country: conv.countryCode || 'N/A',
        eventType: conv.eventType,
        status: conv.status,
        commissionCents: conv.commissionCents || 0,
        commissionEur: (conv.commissionCents || 0) / 100,
        clickedAt: conv.clickedAt?.toISOString() || null,
        convertedAt: conv.occurredAt?.toISOString() || null,
        createdAt: conv.createdAt.toISOString(),
      };
    });

    // Calculate stats
    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'PENDING').length,
      approved: referrals.filter((r) => r.status === 'APPROVED').length,
      rejected: referrals.filter((r) => r.status === 'REJECTED').length,
      totalEarningsEur: referrals
        .filter((r) => r.status === 'APPROVED')
        .reduce((sum, r) => sum + r.commissionEur, 0),
    };

    return {
      referrals,
      stats,
      filters: filters || {},
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
          lt: new Date(
            new Date(`${periodMonth}-01`).setMonth(new Date(`${periodMonth}-01`).getMonth() + 1),
          ),
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

    const allHouses = await this.getAllBettingHouses(true);
    const housesMap = new Map(allHouses.map((h) => [h.id, h]));

    const payouts = [];
    for (const [tipsterId, tipsterConvs] of Object.entries(byTipster)) {
      // Check if payout already exists using raw query
      const existingResult = (await this.prisma.$runCommandRaw({
        find: 'affiliate_payouts',
        filter: { tipster_id: tipsterId, period_month: periodMonth },
        limit: 1,
      })) as any;

      if (existingResult.cursor?.firstBatch?.length > 0) continue;

      // Build house breakdown
      const breakdown: Record<string, any> = {};
      for (const conv of tipsterConvs) {
        if (!breakdown[conv.houseId]) {
          const house = housesMap.get(conv.houseId) as any;
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

      // Create payout using raw MongoDB
      const now = new Date().toISOString();
      const payoutId = new ObjectId();

      await this.prisma.$runCommandRaw({
        insert: 'affiliate_payouts',
        documents: [
          {
            _id: payoutId,
            tipster_id: tipsterId,
            period_month: periodMonth,
            house_breakdown: Object.values(breakdown),
            total_referrals: totalReferrals,
            total_amount_cents: totalAmountCents,
            currency: 'EUR',
            status: 'PENDING',
            created_at: { $date: now },
            updated_at: { $date: now },
          },
        ],
      });

      payouts.push({
        id: payoutId.toHexString(),
        tipsterId,
        periodMonth,
        totalReferrals,
        totalAmountCents,
        status: 'PENDING',
      });
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
    const tipsterIds = [...new Set(payouts.map((p) => p.tipsterId))];
    const tipsters = await this.prisma.tipsterProfile.findMany({
      where: { id: { in: tipsterIds } },
    });
    const tipstersMap = new Map(tipsters.map((t) => [t.id, t.publicName]));

    return payouts.map((p) => ({
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

  // ==================== ADMIN STATISTICS ====================

  async getAdminAffiliateStats(filters: {
    startDate?: string;
    endDate?: string;
    tipsterId?: string;
    campaignId?: string;
    houseId?: string;
  }) {
    // Build date range
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : new Date();

    // Build where clause for clicks
    const clickWhere: any = {
      wasBlocked: false,
      clickedAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (filters.tipsterId) clickWhere.tipsterId = filters.tipsterId;
    if (filters.campaignId) clickWhere.landingId = filters.campaignId; // campaignId = landingId
    if (filters.houseId) clickWhere.houseId = filters.houseId;

    // Build where clause for conversions
    const conversionWhere: any = {
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (filters.tipsterId) conversionWhere.tipsterId = filters.tipsterId;
    if (filters.houseId) conversionWhere.houseId = filters.houseId;

    // Get all clicks from landing_click_events (campaigns)
    // Build filter without date (we'll filter in memory)
    const landingClicksFilter: any = {};
    if (filters.tipsterId) landingClicksFilter.tipster_id = filters.tipsterId;
    if (filters.campaignId) landingClicksFilter.landing_id = filters.campaignId;
    if (filters.houseId) landingClicksFilter.betting_house_id = filters.houseId;

    const landingClicksResult = (await this.prisma.$runCommandRaw({
      find: 'landing_click_events',
      filter: landingClicksFilter,
    })) as any;
    
    // Filter by date in memory
    const landingClicks = (landingClicksResult.cursor?.firstBatch || []).filter((c: any) => {
      const clickDate = c.created_at?.$date ? new Date(c.created_at.$date) : (c.created_at ? new Date(c.created_at) : null);
      if (!clickDate) return false;
      return clickDate >= startDate && clickDate <= endDate;
    });

    // Map landing clicks to a standard format
    const clicks = landingClicks.map((c: any) => ({
      id: c._id.$oid || c._id,
      tipsterId: c.tipster_id,
      landingId: c.landing_id,
      houseId: c.betting_house_id,
      countryCode: c.country_context,
      clickedAt: c.created_at?.$date ? new Date(c.created_at.$date) : new Date(),
      ipAddress: c.ip_address,
      wasBlocked: false,
    }));

    // Get all conversions
    const conversions = await this.prisma.affiliateConversion.findMany({
      where: conversionWhere,
    });

    // Get houses and tipsters for mapping
    const houses = await this.prisma.bettingHouse.findMany();
    const housesMap = new Map(houses.map((h) => [h.id, h]));

    const tipstersResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: {},
      projection: { _id: 1, public_name: 1, slug: 1 },
    })) as any;
    const tipsters = tipstersResult.cursor?.firstBatch || [];
    const tipstersMap = new Map(tipsters.map((t: any) => [t._id.$oid || t._id, t]));

    // Get tipster landings (campaigns created by tipsters)
    const landingsResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: {},
      projection: { _id: 1, title: 1, slug: 1, tipster_id: 1 },
    })) as any;
    const landings = landingsResult.cursor?.firstBatch || [];
    const landingsMap = new Map(
      landings.map((l: any) => [l._id.$oid || l._id || l._id.toString(), l]),
    );

    // General stats
    const totalClicks = clicks.length;
    const uniqueUsers = new Set(clicks.map((c) => (c as any).visitorId || c.ipAddress)).size;
    const totalConversions = conversions.filter((c) => c.status === 'APPROVED').length;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // By Country
    const byCountryMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const click of clicks) {
      const country = click.countryCode || 'UNKNOWN';
      if (!byCountryMap[country]) byCountryMap[country] = { clicks: 0, conversions: 0 };
      byCountryMap[country].clicks++;
    }
    for (const conv of conversions) {
      const country = conv.countryCode || 'UNKNOWN';
      if (!byCountryMap[country]) byCountryMap[country] = { clicks: 0, conversions: 0 };
      if (conv.status === 'APPROVED') byCountryMap[country].conversions++;
    }
    const byCountry = Object.entries(byCountryMap)
      .map(([country, data]) => ({ country, countryName: country, ...data }))
      .sort((a, b) => b.clicks - a.clicks);

    // By House
    const byHouseMap: Record<
      string,
      { clicks: number; conversions: number; commissionEarned: number }
    > = {};
    for (const click of clicks) {
      if (!click.houseId) continue;
      if (!byHouseMap[click.houseId])
        byHouseMap[click.houseId] = { clicks: 0, conversions: 0, commissionEarned: 0 };
      byHouseMap[click.houseId].clicks++;
    }
    for (const conv of conversions) {
      if (!conv.houseId) continue;
      if (!byHouseMap[conv.houseId])
        byHouseMap[conv.houseId] = { clicks: 0, conversions: 0, commissionEarned: 0 };
      if (conv.status === 'APPROVED') {
        byHouseMap[conv.houseId].conversions++;
        byHouseMap[conv.houseId].commissionEarned += conv.commissionCents || 0;
      }
    }
    const byHouse = Object.entries(byHouseMap)
      .map(([houseId, data]) => {
        const house = housesMap.get(houseId);
        return {
          houseId,
          houseName: house?.name || 'Desconocido',
          houseLogo: house?.logoUrl || null,
          ...data,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    // By Date
    const byDateMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const click of clicks) {
      const date = click.clickedAt.toISOString().split('T')[0];
      if (!byDateMap[date]) byDateMap[date] = { clicks: 0, conversions: 0 };
      byDateMap[date].clicks++;
    }
    for (const conv of conversions) {
      const date =
        conv.occurredAt?.toISOString().split('T')[0] || conv.createdAt.toISOString().split('T')[0];
      if (!byDateMap[date]) byDateMap[date] = { clicks: 0, conversions: 0 };
      if (conv.status === 'APPROVED') byDateMap[date].conversions++;
    }
    const byDate = Object.entries(byDateMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By Campaign (using landing_id from clicks)
    const byCampaignMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const click of clicks) {
      // Use landingId if available, otherwise campaignId/promotionId
      const campaignId =
        (click as any).landingId ||
        (click as any).campaignId ||
        (click as any).promotionId ||
        'NO_CAMPAIGN';
      if (!byCampaignMap[campaignId]) byCampaignMap[campaignId] = { clicks: 0, conversions: 0 };
      byCampaignMap[campaignId].clicks++;
    }
    const byCampaign = Object.entries(byCampaignMap)
      .map(([campaignId, data]) => {
        const landing = landingsMap.get(campaignId) as any;
        return {
          campaignId,
          campaignName:
            landing?.title ||
            (campaignId === 'NO_CAMPAIGN' ? 'Sin Campaña' : `Landing ${campaignId.slice(-6)}`),
          ...data,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    // By Tipster
    const byTipsterMap: Record<
      string,
      { clicks: number; conversions: number; commissionEarned: number }
    > = {};
    for (const click of clicks) {
      if (!click.tipsterId) continue;
      if (!byTipsterMap[click.tipsterId])
        byTipsterMap[click.tipsterId] = { clicks: 0, conversions: 0, commissionEarned: 0 };
      byTipsterMap[click.tipsterId].clicks++;
    }
    for (const conv of conversions) {
      if (!conv.tipsterId) continue;
      if (!byTipsterMap[conv.tipsterId])
        byTipsterMap[conv.tipsterId] = { clicks: 0, conversions: 0, commissionEarned: 0 };
      if (conv.status === 'APPROVED') {
        byTipsterMap[conv.tipsterId].conversions++;
        byTipsterMap[conv.tipsterId].commissionEarned += conv.commissionCents || 0;
      }
    }
    const byTipster = Object.entries(byTipsterMap)
      .map(([tipsterId, data]) => {
        const tipster = tipstersMap.get(tipsterId) as any;
        return {
          tipsterId,
          tipsterName: tipster?.public_name || 'Desconocido',
          tipsterSlug: tipster?.slug || '',
          totalClicks: data.clicks,
          conversions: data.conversions,
          commissionEarned: data.commissionEarned,
        };
      })
      .sort((a, b) => b.totalClicks - a.totalClicks);

    // Filter options - use landings (tipster campaigns) instead of promotions
    const filterOptions = {
      tipsters: tipsters.map((t: any) => ({ id: t._id.$oid || t._id, name: t.public_name })),
      campaigns: landings
        .filter((l: any) => l.title) // Only landings with titles
        .map((l: any) => ({ 
          id: l._id.$oid || l._id || l._id.toString(), 
          name: l.title 
        })),
      houses: houses.map((h) => ({ id: h.id, name: h.name })),
    };

    return {
      general: {
        totalClicks,
        uniqueUsers,
        conversions: totalConversions,
        conversionRate,
      },
      byCountry,
      byHouse,
      byDate,
      byCampaign,
      byTipster,
      filterOptions,
    };
  }

  // ==================== TIPSTER STATISTICS ====================

  async getTipsterAffiliateStats(tipsterId: string, startDateStr?: string, endDateStr?: string) {
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : new Date();

    // Get clicks from landing_click_events (primary source for campaign clicks)
    // Note: We fetch all clicks for the tipster and filter in memory because
    // MongoDB $date comparison in raw commands doesn't work well with Prisma
    const landingClicksFilter: any = {
      tipster_id: tipsterId,
    };

    const landingClicksResult = (await this.prisma.$runCommandRaw({
      find: 'landing_click_events',
      filter: landingClicksFilter,
    })) as any;
    
    // Filter by date in memory
    const landingClicks = (landingClicksResult.cursor?.firstBatch || []).filter((c: any) => {
      const clickDate = c.created_at?.$date ? new Date(c.created_at.$date) : (c.created_at ? new Date(c.created_at) : null);
      if (!clickDate) return false;
      return clickDate >= startDate && clickDate <= endDate;
    });

    // Map clicks to a standard format
    const clicks = landingClicks.map((c: any) => ({
      id: c._id.$oid || c._id,
      tipsterId: c.tipster_id,
      landingId: c.landing_id,
      houseId: c.betting_house_id,
      countryCode: c.country_context,
      clickedAt: c.created_at?.$date ? new Date(c.created_at.$date) : new Date(),
    }));

    // Get conversions for this tipster
    const conversions = await this.prisma.affiliateConversion.findMany({
      where: {
        tipsterId,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get houses for mapping
    const houses = await this.prisma.bettingHouse.findMany();
    const housesMap = new Map(houses.map((h) => [h.id, h]));

    // Get landings for mapping (tipster's campaigns)
    const landingsResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { tipster_id: tipsterId },
      projection: { _id: 1, title: 1, slug: 1 },
    })) as any;
    const landings = landingsResult.cursor?.firstBatch || [];
    const landingsMap = new Map(
      landings.map((l: any) => [l._id.$oid || l._id.toString(), l])
    );

    // General stats
    const totalClicks = clicks.length;
    const approvedConversions = conversions.filter((c) => c.status === 'APPROVED');
    const totalConversions = approvedConversions.length;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const totalEarnings = approvedConversions.reduce((sum, c) => sum + (c.commissionCents || 0), 0);

    // By Country
    const byCountryMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const click of clicks) {
      const country = click.countryCode || 'UNKNOWN';
      if (!byCountryMap[country]) byCountryMap[country] = { clicks: 0, conversions: 0 };
      byCountryMap[country].clicks++;
    }
    for (const conv of approvedConversions) {
      const country = conv.countryCode || 'UNKNOWN';
      if (!byCountryMap[country]) byCountryMap[country] = { clicks: 0, conversions: 0 };
      byCountryMap[country].conversions++;
    }
    const byCountry = Object.entries(byCountryMap)
      .map(([country, data]) => ({ country, countryName: country, ...data }))
      .sort((a, b) => b.clicks - a.clicks);

    // By House
    const byHouseMap: Record<
      string,
      { clicks: number; conversions: number; commissionEarned: number }
    > = {};
    for (const click of clicks) {
      if (!click.houseId) continue;
      if (!byHouseMap[click.houseId])
        byHouseMap[click.houseId] = { clicks: 0, conversions: 0, commissionEarned: 0 };
      byHouseMap[click.houseId].clicks++;
    }
    for (const conv of approvedConversions) {
      if (!conv.houseId) continue;
      if (!byHouseMap[conv.houseId])
        byHouseMap[conv.houseId] = { clicks: 0, conversions: 0, commissionEarned: 0 };
      byHouseMap[conv.houseId].conversions++;
      byHouseMap[conv.houseId].commissionEarned += conv.commissionCents || 0;
    }
    const byHouse = Object.entries(byHouseMap)
      .map(([houseId, data]) => {
        const house = housesMap.get(houseId);
        return {
          houseId,
          houseName: house?.name || 'Desconocido',
          houseLogo: house?.logoUrl || null,
          ...data,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    // By Date
    const byDateMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const click of clicks) {
      const date = click.clickedAt.toISOString().split('T')[0];
      if (!byDateMap[date]) byDateMap[date] = { clicks: 0, conversions: 0 };
      byDateMap[date].clicks++;
    }
    for (const conv of approvedConversions) {
      const date =
        conv.occurredAt?.toISOString().split('T')[0] || conv.createdAt.toISOString().split('T')[0];
      if (!byDateMap[date]) byDateMap[date] = { clicks: 0, conversions: 0 };
      byDateMap[date].conversions++;
    }
    const byDate = Object.entries(byDateMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // By Campaign (using landing_id from clicks)
    const byCampaignMap: Record<string, { clicks: number; conversions: number }> = {};
    for (const click of clicks) {
      const landingId = click.landingId || 'NO_CAMPAIGN';
      if (!byCampaignMap[landingId]) byCampaignMap[landingId] = { clicks: 0, conversions: 0 };
      byCampaignMap[landingId].clicks++;
    }
    const byCampaign = Object.entries(byCampaignMap)
      .map(([landingId, data]) => {
        const landing = landingsMap.get(landingId) as any;
        return {
          campaignId: landingId,
          campaignName:
            landing?.title ||
            (landingId === 'NO_CAMPAIGN' ? 'Sin Campaña' : `Campaña ${landingId.slice(-6)}`),
          ...data,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    return {
      general: {
        totalClicks,
        conversions: totalConversions,
        conversionRate,
        totalEarnings,
      },
      byCountry,
      byHouse,
      byDate,
      byCampaign,
    };
  }

  // ==================== POSTBACK HANDLER ====================

  async handlePostback(params: {
    subid: string;
    houseSlug?: string;
    event?: string;
    amount?: number;
    currency?: string;
    transactionId?: string;
    userEmail?: string;
    userTelegram?: string;
    externalRefId?: string;
    autoApprove?: boolean;
  }) {
    const { subid, houseSlug, event, amount, currency, transactionId, userEmail, userTelegram, externalRefId, autoApprove } = params;

    // Parse subid: format is tipsterId_clickId or just tipsterId
    const [tipsterId, clickId] = subid.split('_');

    if (!tipsterId) {
      throw new BadRequestException('Invalid subid format');
    }

    // Find the click event if clickId provided
    let click: any = null;
    if (clickId) {
      click = await this.prisma.affiliateClickEvent.findFirst({
        where: { id: clickId },
      });
    }

    // Find the house
    let house: any = null;
    if (houseSlug) {
      house = await this.prisma.bettingHouse.findFirst({
        where: { slug: houseSlug.toLowerCase() },
      });
    }

    // Calculate commission
    let commissionCents = 0;
    if (click?.promotionHouseLinkId) {
      // Get commission from promotion house link
      const linkResult = (await this.prisma.$runCommandRaw({
        find: 'promotion_house_links',
        filter: { _id: { $oid: click.promotionHouseLinkId } },
        projection: { commission_cents: 1 },
        limit: 1,
      })) as any;
      const link = linkResult.cursor?.firstBatch?.[0];
      commissionCents = link?.commission_cents || house?.commissionPerReferralCents || 5000;
    } else if (house) {
      commissionCents = house.commissionPerReferralCents || 5000;
    }

    // Determine status - auto approve if flag is set (for simulator/testing)
    // In production, conversions from real betting houses would be approved manually or via webhook confirmation
    const status = autoApprove ? 'APPROVED' : 'PENDING';

    // Create conversion using raw MongoDB command
    const now = new Date().toISOString();
    const conversionId = new ObjectId();

    await this.prisma.$runCommandRaw({
      insert: 'affiliate_conversions',
      documents: [
        {
          _id: conversionId,
          tipster_id: tipsterId,
          house_id: house?.id || click?.houseId,
          click_id: clickId || null,
          event_type: event || 'REGISTRATION',
          status: status,
          commission_cents: commissionCents,
          country_code: click?.countryCode || null,
          clicked_at: click?.clickedAt ? { $date: click.clickedAt } : null,
          occurred_at: { $date: now },
          approved_at: autoApprove ? { $date: now } : null,
          external_transaction_id: transactionId || null,
          // User data
          user_email: userEmail || null,
          user_telegram: userTelegram || null,
          external_ref_id: externalRefId || null,
          metadata: {
            subid,
            houseSlug,
            event,
            amount,
            currency,
          },
          created_at: { $date: now },
          updated_at: { $date: now },
        },
      ],
    });

    return {
      success: true,
      conversionId: conversionId.toHexString(),
      status: status,
      message: `Conversion recorded successfully (${status})`,
    };
  }
}
