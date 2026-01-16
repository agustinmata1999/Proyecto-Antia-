import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateLandingDto, UpdateLandingDto, LandingCountryConfigDto } from './dto';

@Injectable()
export class LandingService {
  constructor(private prisma: PrismaService) {}

  // ==================== LANDING CRUD ====================

  /**
   * Crear una nueva landing para un tipster
   */
  async createLanding(tipsterId: string, dto: CreateLandingDto) {
    // Obtener info del tipster para generar slug
    const tipsterResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: {
        $or: [{ _id: tipsterId }, { _id: { $oid: tipsterId } }, { id: tipsterId }],
      },
      limit: 1,
    })) as any;

    const tipster = tipsterResult.cursor?.firstBatch?.[0];
    if (!tipster) {
      throw new NotFoundException('Tipster no encontrado');
    }

    // Generar slug automático
    const publicName = tipster.public_name || 'tipster';
    const baseSlug = this.generateSlug(publicName);
    const shortId = tipsterId.slice(-6);
    let slug = `${baseSlug}-${shortId}`;

    // Si tiene título, usar el título para el slug
    if (dto.title) {
      const titleSlug = this.generateSlug(dto.title);
      slug = `${baseSlug}-${titleSlug}`;
    }

    // Asegurar unicidad del slug
    slug = await this.ensureUniqueSlug(slug);

    const now = new Date().toISOString();
    const landingId = new ObjectId();

    // Crear la landing
    await this.prisma.$runCommandRaw({
      insert: 'tipster_affiliate_landings',
      documents: [
        {
          _id: landingId,
          tipster_id: tipsterId,
          promotion_id: dto.promotionId || null, // Reto/promoción seleccionado
          slug,
          title: dto.title || null,
          description: dto.description || null,
          image_url: dto.imageUrl || null, // Imagen de portada
          countries_enabled: dto.countriesEnabled,
          is_active: true,
          total_clicks: 0,
          total_impressions: 0,
          created_at: { $date: now },
          updated_at: { $date: now },
        },
      ],
    });

    // Crear los items por país
    if (dto.countryConfigs && dto.countryConfigs.length > 0) {
      await this.createLandingItems(landingId.toHexString(), dto.countryConfigs);
    }

    return {
      id: landingId.toHexString(),
      slug,
      promotionId: dto.promotionId,
      title: dto.title,
      countriesEnabled: dto.countriesEnabled,
      isActive: true,
      shareUrl: `/go/${slug}`,
    };
  }

  /**
   * Crear items de landing (casas por país)
   */
  private async createLandingItems(landingId: string, countryConfigs: LandingCountryConfigDto[]) {
    const now = new Date().toISOString();
    const documents = [];

    for (const config of countryConfigs) {
      for (const item of config.items) {
        documents.push({
          _id: new ObjectId(),
          landing_id: landingId,
          country: config.country,
          betting_house_id: item.bettingHouseId,
          order_index: item.orderIndex,
          custom_terms_text: item.customTermsText || null,
          is_enabled: true,
          created_at: { $date: now },
          updated_at: { $date: now },
        });
      }
    }

    if (documents.length > 0) {
      await this.prisma.$runCommandRaw({
        insert: 'tipster_landing_items',
        documents,
      });
    }
  }

  /**
   * Obtener landings de un tipster
   */
  async getTipsterLandings(tipsterId: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { tipster_id: tipsterId },
      sort: { created_at: -1 },
    })) as any;

    const landings = result.cursor?.firstBatch || [];

    // Obtener info de promociones
    const promotionIds = landings.map((l: any) => l.promotion_id).filter(Boolean);
    const promotionsMap = await this.getPromotionsMap(promotionIds);

    // Obtener conteo real de clicks e impresiones desde las colecciones de eventos
    const landingIds = landings.map((l: any) => l._id.$oid || l._id.toString());
    
    // Agregar clicks por landing_id
    const clicksResult = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: { landing_id: { $in: landingIds } } },
        { $group: { _id: '$landing_id', count: { $sum: 1 } } },
      ],
      cursor: {},
    })) as any;
    const clicksMap = new Map(
      (clicksResult.cursor?.firstBatch || []).map((c: any) => [c._id, c.count])
    );

    // Agregar impresiones por landing_id
    const impressionsResult = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_impression_events',
      pipeline: [
        { $match: { landing_id: { $in: landingIds } } },
        { $group: { _id: '$landing_id', count: { $sum: 1 } } },
      ],
      cursor: {},
    })) as any;
    const impressionsMap = new Map(
      (impressionsResult.cursor?.firstBatch || []).map((i: any) => [i._id, i.count])
    );

    return landings.map((l: any) => {
      const promotion = l.promotion_id ? promotionsMap.get(l.promotion_id) : null;
      const landingId = l._id.$oid || l._id.toString();
      
      // Usar conteo real de eventos, fallback a los contadores guardados
      const realClicks = clicksMap.get(landingId) || l.total_clicks || 0;
      const realImpressions = impressionsMap.get(landingId) || l.total_impressions || 0;
      
      return {
        id: landingId,
        slug: l.slug,
        promotionId: l.promotion_id,
        promotionName: promotion?.name || null,
        title: l.title,
        description: l.description,
        imageUrl: l.image_url || null, // Imagen de portada
        countriesEnabled: l.countries_enabled || [],
        isActive: l.is_active,
        totalClicks: realClicks,
        totalImpressions: realImpressions,
        shareUrl: `/go/${l.slug}`,
        createdAt: l.created_at?.$date || l.created_at,
      };
    });
  }

  /**
   * Obtener mapa de promociones por ID
   */
  private async getPromotionsMap(promotionIds: string[]) {
    if (!promotionIds.length) return new Map();

    const result = (await this.prisma.$runCommandRaw({
      find: 'affiliate_promotions',
    })) as any;

    const promotions = result.cursor?.firstBatch || [];
    const map = new Map();

    for (const p of promotions) {
      const id = p._id.$oid || p._id.toString();
      if (promotionIds.includes(id)) {
        map.set(id, { name: p.name, slug: p.slug });
      }
    }

    return map;
  }

  /**
   * Obtener una landing por ID
   */
  async getLandingById(landingId: string) {
    // Intentar buscar por ObjectId
    let result = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { _id: { $oid: landingId } },
      limit: 1,
    })) as any;

    let landing = result.cursor?.firstBatch?.[0];

    // Si no se encuentra, intentar por string
    if (!landing) {
      result = (await this.prisma.$runCommandRaw({
        find: 'tipster_affiliate_landings',
        filter: { _id: landingId },
        limit: 1,
      })) as any;
      landing = result.cursor?.firstBatch?.[0];
    }

    // Si aún no se encuentra, intentar por id field
    if (!landing) {
      result = (await this.prisma.$runCommandRaw({
        find: 'tipster_affiliate_landings',
        filter: { id: landingId },
        limit: 1,
      })) as any;
      landing = result.cursor?.firstBatch?.[0];
    }

    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }

    const landingIdStr = landing._id.$oid || landing._id.toString();

    // Obtener conteo real de clicks desde landing_click_events
    const clicksCountResult = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: { landing_id: landingIdStr } },
        { $count: 'total' },
      ],
      cursor: {},
    })) as any;
    const realClicks = clicksCountResult.cursor?.firstBatch?.[0]?.total || landing.total_clicks || 0;

    // Obtener conteo real de impresiones desde landing_impression_events
    const impressionsCountResult = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_impression_events',
      pipeline: [
        { $match: { landing_id: landingIdStr } },
        { $count: 'total' },
      ],
      cursor: {},
    })) as any;
    const realImpressions = impressionsCountResult.cursor?.firstBatch?.[0]?.total || landing.total_impressions || 0;

    // Obtener items
    const itemsResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_landing_items',
      filter: { landing_id: landingIdStr },
      sort: { country: 1, order_index: 1 },
    })) as any;

    const items = itemsResult.cursor?.firstBatch || [];

    // Agrupar items por país
    const countryConfigs: Record<string, any[]> = {};
    for (const item of items) {
      const country = item.country;
      if (!countryConfigs[country]) {
        countryConfigs[country] = [];
      }
      countryConfigs[country].push({
        id: item._id.$oid || item._id.toString(),
        bettingHouseId: item.betting_house_id,
        orderIndex: item.order_index,
        customTermsText: item.custom_terms_text,
        isEnabled: item.is_enabled,
      });
    }

    return {
      id: landingIdStr,
      tipsterId: landing.tipster_id,
      slug: landing.slug,
      title: landing.title,
      description: landing.description,
      imageUrl: landing.image_url || null, // Imagen de portada
      countriesEnabled: landing.countries_enabled || [],
      isActive: landing.is_active,
      totalClicks: realClicks,
      totalImpressions: realImpressions,
      countryConfigs,
      shareUrl: `/go/${landing.slug}`,
      createdAt: landing.created_at?.$date || landing.created_at,
    };
  }

  /**
   * Actualizar una landing
   */
  async updateLanding(landingId: string, tipsterId: string, dto: UpdateLandingDto) {
    // Log incoming data
    console.log('[LandingService] updateLanding called with:', {
      landingId,
      tipsterId,
      dto: JSON.stringify(dto),
    });

    // Verificar propiedad
    const landing = await this.getLandingById(landingId);
    if (landing.tipsterId !== tipsterId) {
      throw new BadRequestException('No tienes permiso para editar esta landing');
    }

    const now = new Date().toISOString();
    const updateFields: any = { updated_at: { $date: now } };

    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.imageUrl !== undefined) updateFields.image_url = dto.imageUrl; // Imagen de portada
    if (dto.countriesEnabled) updateFields.countries_enabled = dto.countriesEnabled;
    if (dto.isActive !== undefined) updateFields.is_active = dto.isActive;

    console.log('[LandingService] updateFields:', JSON.stringify(updateFields));

    // Try to update with ObjectId first
    let updateResult: any = await this.prisma.$runCommandRaw({
      update: 'tipster_affiliate_landings',
      updates: [
        {
          q: { _id: { $oid: landingId } },
          u: { $set: updateFields },
        },
      ],
    });

    // If no documents modified, try with string _id
    if (updateResult.nModified === 0 || updateResult.n === 0) {
      console.log('[LandingService] ObjectId update failed, trying string _id...');
      updateResult = await this.prisma.$runCommandRaw({
        update: 'tipster_affiliate_landings',
        updates: [
          {
            q: { _id: landingId },
            u: { $set: updateFields },
          },
        ],
      });
      console.log('[LandingService] String _id update result:', JSON.stringify(updateResult));
    }

    // Si hay countryConfigs, actualizar items
    if (dto.countryConfigs) {
      // Eliminar items existentes
      await this.prisma.$runCommandRaw({
        delete: 'tipster_landing_items',
        deletes: [
          {
            q: { landing_id: landingId },
            limit: 0, // 0 = delete all matching
          },
        ],
      });

      // Crear nuevos items
      await this.createLandingItems(landingId, dto.countryConfigs);
    }

    return this.getLandingById(landingId);
  }

  /**
   * Eliminar una landing
   */
  async deleteLanding(landingId: string, tipsterId: string) {
    const landing = await this.getLandingById(landingId);
    if (landing.tipsterId !== tipsterId) {
      throw new BadRequestException('No tienes permiso para eliminar esta landing');
    }

    // Eliminar items
    await this.prisma.$runCommandRaw({
      delete: 'tipster_landing_items',
      deletes: [
        {
          q: { landing_id: landingId },
          limit: 0,
        },
      ],
    });

    // Eliminar landing
    await this.prisma.$runCommandRaw({
      delete: 'tipster_affiliate_landings',
      deletes: [
        {
          q: { _id: { $oid: landingId } },
          limit: 1,
        },
      ],
    });

    return { success: true };
  }

  // ==================== LANDING PÚBLICA ====================

  /**
   * Obtener landing pública por slug (para /go/:slug)
   */
  async getPublicLanding(slug: string, countryCode?: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { slug, is_active: true },
      limit: 1,
    })) as any;

    const landing = result.cursor?.firstBatch?.[0];
    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }

    const landingId = landing._id.$oid || landing._id.toString();
    const countriesEnabled = landing.countries_enabled || [];

    // Determinar país a usar
    let selectedCountry = countryCode;
    if (!selectedCountry || !countriesEnabled.includes(selectedCountry)) {
      selectedCountry = countriesEnabled[0] || 'ES';
    }

    // Obtener tipster info
    const tipsterResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: {
        $or: [
          { _id: landing.tipster_id },
          { _id: { $oid: landing.tipster_id } },
          { id: landing.tipster_id },
        ],
      },
      limit: 1,
    })) as any;
    const tipster = tipsterResult.cursor?.firstBatch?.[0];

    // Obtener items para el país seleccionado
    const itemsResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_landing_items',
      filter: {
        landing_id: landingId,
        country: selectedCountry,
        is_enabled: true,
      },
      sort: { order_index: 1 },
    })) as any;

    const items = itemsResult.cursor?.firstBatch || [];

    // Enriquecer con info de las casas
    const houseIds = items.map((i: any) => i.betting_house_id);
    const houses = await this.getBettingHousesByIds(houseIds);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    const enrichedItems = items
      .map((item: any) => {
        const house: any = housesMap.get(item.betting_house_id);
        return {
          id: item._id.$oid || item._id.toString(),
          bettingHouseId: item.betting_house_id,
          orderIndex: item.order_index,
          customTermsText: item.custom_terms_text,
          house: house
            ? {
                id: house.id,
                name: house.name,
                slug: house.slug,
                logoUrl: house.logoUrl,
                logoBgColor: house.logoBgColor || null,
                termsText: item.custom_terms_text || house.description || 'Deposita al menos 10€',
                websiteUrl: house.websiteUrl,
              }
            : null,
        };
      })
      .filter((item: any) => item.house !== null);

    return {
      id: landingId,
      slug: landing.slug,
      title: landing.title,
      description: landing.description,
      tipster: tipster
        ? {
            id: tipster._id?.$oid || tipster._id?.toString() || tipster.id,
            publicName: tipster.public_name,
            avatarUrl: tipster.avatar_url,
          }
        : null,
      countriesEnabled,
      selectedCountry,
      items: enrichedItems,
    };
  }

  // ==================== CLICK TRACKING ====================

  /**
   * Registrar click y generar URL de redirección
   */
  async recordClickAndRedirect(
    slug: string,
    bettingHouseId: string,
    countryCode: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
    anonymousSessionId?: string,
  ) {
    // Obtener landing
    const landingResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { slug, is_active: true },
      limit: 1,
    })) as any;

    const landing = landingResult.cursor?.firstBatch?.[0];
    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }

    const landingId = landing._id.$oid || landing._id.toString();
    const tipsterId = landing.tipster_id;
    const promotionId = landing.promotion_id;

    // Obtener casa de apuestas
    const house = await this.getBettingHouseById(bettingHouseId);
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    // Generar clickId único
    const clickId = uuidv4();

    // Construir URL de redirección con tracking
    // Si hay promotionId, usar el link específico de la promoción
    const redirectUrl = await this.buildRedirectUrl(
      house,
      tipsterId,
      clickId,
      countryCode,
      promotionId,
      bettingHouseId,
    );

    // Registrar evento de click
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      insert: 'landing_click_events',
      documents: [
        {
          _id: new ObjectId(),
          click_id: clickId,
          tipster_id: tipsterId,
          landing_id: landingId,
          betting_house_id: bettingHouseId,
          country_context: countryCode,
          anonymous_session_id: anonymousSessionId || null,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          referrer: referrer || null,
          redirect_url: redirectUrl,
          created_at: { $date: now },
        },
      ],
    });

    // Actualizar contador de clicks en la landing usando ObjectId nativo
    try {
      await this.prisma.$runCommandRaw({
        update: 'tipster_affiliate_landings',
        updates: [
          {
            q: { _id: new ObjectId(landingId) },
            u: { $inc: { total_clicks: 1 } },
          },
        ],
      });
    } catch (e) {
      // Fallback: try with $oid syntax
      await this.prisma.$runCommandRaw({
        update: 'tipster_affiliate_landings',
        updates: [
          {
            q: { _id: { $oid: landingId } },
            u: { $inc: { total_clicks: 1 } },
          },
        ],
      });
    }

    // También registrar en affiliate_click_events para compatibilidad
    await this.prisma.$runCommandRaw({
      insert: 'affiliate_click_events',
      documents: [
        {
          _id: new ObjectId(),
          tipster_id: tipsterId,
          house_id: bettingHouseId,
          link_id: null,
          ip_address: ipAddress || null,
          country_code: countryCode,
          user_agent: userAgent || null,
          referer: referrer || null,
          was_blocked: false,
          block_reason: null,
          redirected_to: redirectUrl,
          clicked_at: { $date: now },
          created_at: { $date: now },
        },
      ],
    });

    return {
      redirectUrl,
      clickId,
    };
  }

  /**
   * Registrar impresión de landing
   */
  async recordImpression(
    slug: string,
    countryCode: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
    anonymousSessionId?: string,
  ) {
    const landingResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { slug, is_active: true },
      limit: 1,
    })) as any;

    const landing = landingResult.cursor?.firstBatch?.[0];
    if (!landing) return;

    const landingId = landing._id.$oid || landing._id.toString();
    const now = new Date().toISOString();

    // Registrar impresión
    await this.prisma.$runCommandRaw({
      insert: 'landing_impression_events',
      documents: [
        {
          _id: new ObjectId(),
          tipster_id: landing.tipster_id,
          landing_id: landingId,
          country_context: countryCode,
          anonymous_session_id: anonymousSessionId || null,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          referrer: referrer || null,
          created_at: { $date: now },
        },
      ],
    });

    // Actualizar contador usando ObjectId nativo
    try {
      await this.prisma.$runCommandRaw({
        update: 'tipster_affiliate_landings',
        updates: [
          {
            q: { _id: new ObjectId(landingId) },
            u: { $inc: { total_impressions: 1 } },
          },
        ],
      });
    } catch (e) {
      // Fallback: try with $oid syntax
      await this.prisma.$runCommandRaw({
        update: 'tipster_affiliate_landings',
        updates: [
          {
            q: { _id: { $oid: landingId } },
            u: { $inc: { total_impressions: 1 } },
          },
        ],
      });
    }
  }

  // ==================== MÉTRICAS ====================

  /**
   * Obtener métricas de una landing
   */
  async getLandingMetrics(landingId: string, tipsterId: string, startDate?: Date, endDate?: Date) {
    const landing = await this.getLandingById(landingId);
    if (landing.tipsterId !== tipsterId) {
      throw new BadRequestException('No tienes permiso para ver estas métricas');
    }

    // Build date filter for MongoDB query
    const buildDateMatch = () => {
      const match: any = { landing_id: landingId };
      if (startDate || endDate) {
        match.created_at = {};
        if (startDate) {
          match.created_at.$gte = { $date: startDate.toISOString() };
        }
        if (endDate) {
          match.created_at.$lte = { $date: endDate.toISOString() };
        }
      }
      return match;
    };

    // Clicks por país
    const clicksByCountry = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: buildDateMatch() },
        { $group: { _id: '$country_context', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      cursor: {},
    })) as any;

    // Clicks por casa
    const clicksByHouse = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: buildDateMatch() },
        { $group: { _id: '$betting_house_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      cursor: {},
    })) as any;

    // Clicks por día (últimos 30 días)
    const clicksByDate = (await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: buildDateMatch() },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ],
      cursor: {},
    })) as any;

    // Conversiones/Referidos de este landing (por tipsterId)
    const conversions = await this.prisma.affiliateConversion.findMany({
      where: { tipsterId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Enriquecer clicks por casa con nombres
    const houseIds = (clicksByHouse.cursor?.firstBatch || []).map((c: any) => c._id);
    const houses = await this.getBettingHousesByIds(houseIds);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    // Stats de conversiones
    const conversionStats = {
      total: conversions.length,
      approved: conversions.filter((c) => c.status === 'APPROVED').length,
      pending: conversions.filter((c) => c.status === 'PENDING').length,
      rejected: conversions.filter((c) => c.status === 'REJECTED').length,
      totalEarningsCents: conversions
        .filter((c) => c.status === 'APPROVED')
        .reduce((sum, c) => sum + (c.commissionCents || 0), 0),
    };

    return {
      landing: {
        id: landing.id,
        slug: landing.slug,
        title: landing.title,
        totalClicks: landing.totalClicks,
        totalImpressions: landing.totalImpressions,
      },
      general: {
        clicks: landing.totalClicks,
        impressions: landing.totalImpressions,
        conversions: conversionStats.approved,
        conversionRate:
          landing.totalClicks > 0
            ? ((conversionStats.approved / landing.totalClicks) * 100).toFixed(1)
            : '0',
        earnings: conversionStats.totalEarningsCents,
      },
      clicksByCountry: (clicksByCountry.cursor?.firstBatch || []).map((c: any) => ({
        country: c._id || 'UNKNOWN',
        clicks: c.count,
      })),
      clicksByHouse: (clicksByHouse.cursor?.firstBatch || []).map((c: any) => {
        const house: any = housesMap.get(c._id);
        return {
          houseId: c._id,
          houseName: house?.name || 'Desconocida',
          clicks: c.count,
        };
      }),
      clicksByDate: (clicksByDate.cursor?.firstBatch || []).map((c: any) => ({
        date: c._id,
        clicks: c.count,
      })),
      conversions: conversionStats,
      recentReferrals: conversions.slice(0, 10).map((c) => ({
        id: c.id,
        status: c.status,
        eventType: c.eventType,
        commissionCents: c.commissionCents,
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * Obtener historial de clicks de una landing
   */
  async getLandingClickHistory(landingId: string, tipsterId: string, page = 1, limit = 50) {
    const landing = await this.getLandingById(landingId);
    if (landing.tipsterId !== tipsterId) {
      throw new BadRequestException('No tienes permiso para ver este historial');
    }

    const skip = (page - 1) * limit;

    const result = (await this.prisma.$runCommandRaw({
      find: 'landing_click_events',
      filter: { landing_id: landingId },
      sort: { created_at: -1 },
      skip,
      limit,
    })) as any;

    const clicks = result.cursor?.firstBatch || [];

    // Enriquecer con info de casas
    const houseIds = [...new Set(clicks.map((c: any) => c.betting_house_id))];
    const houses = await this.getBettingHousesByIds(houseIds as string[]);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    return clicks.map((click: any) => {
      const house: any = housesMap.get(click.betting_house_id);
      return {
        id: click._id.$oid || click._id.toString(),
        clickId: click.click_id,
        country: click.country_context,
        house: house
          ? {
              id: house.id,
              name: house.name,
              slug: house.slug,
            }
          : null,
        createdAt: click.created_at?.$date || click.created_at,
      };
    });
  }

  // ==================== HELPERS ====================

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = (await this.prisma.$runCommandRaw({
        find: 'tipster_affiliate_landings',
        filter: { slug },
        limit: 1,
      })) as any;

      if (!existing.cursor?.firstBatch?.length) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async getBettingHouseById(houseId: string) {
    // Intentar con string ID primero
    let result = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { _id: houseId },
      limit: 1,
    })) as any;

    if (!result.cursor?.firstBatch?.length) {
      // Intentar con ObjectId
      result = (await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: { $oid: houseId } },
        limit: 1,
      })) as any;
    }

    const house = result.cursor?.firstBatch?.[0];
    if (!house) return null;

    return {
      id: house._id.$oid || house._id.toString(),
      name: house.name,
      slug: house.slug,
      logoUrl: house.logo_url,
      status: house.status,
      masterAffiliateUrl: house.master_affiliate_url,
      trackingParamName: house.tracking_param_name || 'subid',
      description: house.description,
      websiteUrl: house.website_url,
      allowedCountries: house.allowed_countries || [],
    };
  }

  private async getBettingHousesByIds(houseIds: string[]) {
    if (!houseIds.length) return [];

    // Obtener todas las casas y filtrar
    const result = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { status: 'ACTIVE' },
    })) as any;

    const allHouses = result.cursor?.firstBatch || [];

    return allHouses
      .filter((h: any) => {
        const id = h._id.$oid || h._id.toString();
        return houseIds.includes(id);
      })
      .map((h: any) => ({
        id: h._id.$oid || h._id.toString(),
        name: h.name,
        slug: h.slug,
        logoUrl: h.logo_url,
        logoBgColor: h.logo_bg_color || null,
        status: h.status,
        masterAffiliateUrl: h.master_affiliate_url,
        trackingParamName: h.tracking_param_name || 'subid',
        description: h.description,
        websiteUrl: h.website_url,
        allowedCountries: h.allowed_countries || [],
      }));
  }

  private async buildRedirectUrl(
    house: any,
    tipsterId: string,
    clickId: string,
    countryCode: string,
    promotionId?: string,
    bettingHouseId?: string,
  ): Promise<string> {
    let baseUrl = house.masterAffiliateUrl;
    let trackingParamName = house.trackingParamName || 'subid';

    // Special handling for simulator house
    if (house.slug === 'simulator' || baseUrl === 'INTERNAL_SIMULATOR') {
      const appUrl = process.env.APP_URL || 'http://localhost:8001';
      return `${appUrl}/api/simulator/landing?subid=${tipsterId}&affiliate=antia&clickid=${clickId}`;
    }

    // Si hay promotionId, buscar el link específico de la promoción
    if (promotionId && bettingHouseId) {
      const promotionLinkResult = (await this.prisma.$runCommandRaw({
        find: 'promotion_house_links',
        filter: {
          promotion_id: promotionId,
          betting_house_id: bettingHouseId,
          is_active: true,
        },
        limit: 1,
      })) as any;

      const promotionLink = promotionLinkResult.cursor?.firstBatch?.[0];
      if (promotionLink && promotionLink.affiliate_url) {
        baseUrl = promotionLink.affiliate_url;
        // Si la promoción tiene su propio tracking param, usarlo
        if (promotionLink.tracking_param_name) {
          trackingParamName = promotionLink.tracking_param_name;
        }
      }
    }

    const url = new URL(baseUrl);

    // Añadir parámetros de tracking
    url.searchParams.set(trackingParamName, tipsterId);
    url.searchParams.set('clickid', clickId);

    return url.toString();
  }

  /**
   * Obtener casas de apuestas disponibles para un país
   */
  async getAvailableHousesForCountry(country: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { status: 'ACTIVE' },
    })) as any;

    const houses = result.cursor?.firstBatch || [];

    return houses
      .filter((h: any) => {
        const allowed = h.allowed_countries || [];
        const blocked = h.blocked_countries || [];

        // Si tiene allowed_countries, debe incluir el país
        if (allowed.length > 0 && !allowed.includes(country)) {
          return false;
        }
        // Si tiene blocked_countries, no debe incluir el país
        if (blocked.includes(country)) {
          return false;
        }
        return true;
      })
      .map((h: any) => ({
        id: h._id.$oid || h._id.toString(),
        name: h.name,
        slug: h.slug,
        logoUrl: h.logo_url,
        description: h.description,
        websiteUrl: h.website_url,
        commissionPerReferralEur: (h.commission_per_referral_cents || 0) / 100,
      }));
  }
}
