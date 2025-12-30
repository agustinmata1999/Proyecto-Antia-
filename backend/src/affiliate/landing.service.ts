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
    const tipsterResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { 
        $or: [
          { _id: tipsterId },
          { _id: { $oid: tipsterId } },
          { id: tipsterId }
        ]
      },
      limit: 1,
    }) as any;

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
      documents: [{
        _id: landingId,
        tipster_id: tipsterId,
        promotion_id: dto.promotionId || null,  // Reto/promoción seleccionado
        slug,
        title: dto.title || null,
        description: dto.description || null,
        countries_enabled: dto.countriesEnabled,
        is_active: true,
        total_clicks: 0,
        total_impressions: 0,
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
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
    const result = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { tipster_id: tipsterId },
      sort: { created_at: -1 },
    }) as any;

    const landings = result.cursor?.firstBatch || [];

    return landings.map((l: any) => ({
      id: l._id.$oid || l._id.toString(),
      slug: l.slug,
      title: l.title,
      description: l.description,
      countriesEnabled: l.countries_enabled || [],
      isActive: l.is_active,
      totalClicks: l.total_clicks || 0,
      totalImpressions: l.total_impressions || 0,
      shareUrl: `/go/${l.slug}`,
      createdAt: l.created_at?.$date || l.created_at,
    }));
  }

  /**
   * Obtener una landing por ID
   */
  async getLandingById(landingId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { _id: { $oid: landingId } },
      limit: 1,
    }) as any;

    const landing = result.cursor?.firstBatch?.[0];
    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }

    // Obtener items
    const itemsResult = await this.prisma.$runCommandRaw({
      find: 'tipster_landing_items',
      filter: { landing_id: landingId },
      sort: { country: 1, order_index: 1 },
    }) as any;

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
      id: landing._id.$oid || landing._id.toString(),
      tipsterId: landing.tipster_id,
      slug: landing.slug,
      title: landing.title,
      description: landing.description,
      countriesEnabled: landing.countries_enabled || [],
      isActive: landing.is_active,
      totalClicks: landing.total_clicks || 0,
      totalImpressions: landing.total_impressions || 0,
      countryConfigs,
      shareUrl: `/go/${landing.slug}`,
      createdAt: landing.created_at?.$date || landing.created_at,
    };
  }

  /**
   * Actualizar una landing
   */
  async updateLanding(landingId: string, tipsterId: string, dto: UpdateLandingDto) {
    // Verificar propiedad
    const landing = await this.getLandingById(landingId);
    if (landing.tipsterId !== tipsterId) {
      throw new BadRequestException('No tienes permiso para editar esta landing');
    }

    const now = new Date().toISOString();
    const updateFields: any = { updated_at: { $date: now } };

    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.countriesEnabled) updateFields.countries_enabled = dto.countriesEnabled;
    if (dto.isActive !== undefined) updateFields.is_active = dto.isActive;

    await this.prisma.$runCommandRaw({
      update: 'tipster_affiliate_landings',
      updates: [{
        q: { _id: { $oid: landingId } },
        u: { $set: updateFields },
      }],
    });

    // Si hay countryConfigs, actualizar items
    if (dto.countryConfigs) {
      // Eliminar items existentes
      await this.prisma.$runCommandRaw({
        delete: 'tipster_landing_items',
        deletes: [{
          q: { landing_id: landingId },
          limit: 0, // 0 = delete all matching
        }],
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
      deletes: [{
        q: { landing_id: landingId },
        limit: 0,
      }],
    });

    // Eliminar landing
    await this.prisma.$runCommandRaw({
      delete: 'tipster_affiliate_landings',
      deletes: [{
        q: { _id: { $oid: landingId } },
        limit: 1,
      }],
    });

    return { success: true };
  }

  // ==================== LANDING PÚBLICA ====================

  /**
   * Obtener landing pública por slug (para /go/:slug)
   */
  async getPublicLanding(slug: string, countryCode?: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { slug, is_active: true },
      limit: 1,
    }) as any;

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
    const tipsterResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { 
        $or: [
          { _id: landing.tipster_id },
          { _id: { $oid: landing.tipster_id } },
          { id: landing.tipster_id }
        ]
      },
      limit: 1,
    }) as any;
    const tipster = tipsterResult.cursor?.firstBatch?.[0];

    // Obtener items para el país seleccionado
    const itemsResult = await this.prisma.$runCommandRaw({
      find: 'tipster_landing_items',
      filter: { 
        landing_id: landingId, 
        country: selectedCountry,
        is_enabled: true,
      },
      sort: { order_index: 1 },
    }) as any;

    const items = itemsResult.cursor?.firstBatch || [];

    // Enriquecer con info de las casas
    const houseIds = items.map((i: any) => i.betting_house_id);
    const houses = await this.getBettingHousesByIds(houseIds);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    const enrichedItems = items.map((item: any) => {
      const house: any = housesMap.get(item.betting_house_id);
      return {
        id: item._id.$oid || item._id.toString(),
        bettingHouseId: item.betting_house_id,
        orderIndex: item.order_index,
        customTermsText: item.custom_terms_text,
        house: house ? {
          id: house.id,
          name: house.name,
          slug: house.slug,
          logoUrl: house.logoUrl,
          termsText: item.custom_terms_text || house.description || 'Deposita al menos 10€',
          websiteUrl: house.websiteUrl,
        } : null,
      };
    }).filter((item: any) => item.house !== null);

    return {
      id: landingId,
      slug: landing.slug,
      title: landing.title,
      description: landing.description,
      tipster: tipster ? {
        id: tipster._id?.$oid || tipster._id?.toString() || tipster.id,
        publicName: tipster.public_name,
        avatarUrl: tipster.avatar_url,
      } : null,
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
    const landingResult = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { slug, is_active: true },
      limit: 1,
    }) as any;

    const landing = landingResult.cursor?.firstBatch?.[0];
    if (!landing) {
      throw new NotFoundException('Landing no encontrada');
    }

    const landingId = landing._id.$oid || landing._id.toString();
    const tipsterId = landing.tipster_id;

    // Obtener casa de apuestas
    const house = await this.getBettingHouseById(bettingHouseId);
    if (!house) {
      throw new NotFoundException('Casa de apuestas no encontrada');
    }

    // Generar clickId único
    const clickId = uuidv4();

    // Construir URL de redirección con tracking
    const redirectUrl = this.buildRedirectUrl(house, tipsterId, clickId, countryCode);

    // Registrar evento de click
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      insert: 'landing_click_events',
      documents: [{
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
      }],
    });

    // Actualizar contador de clicks en la landing
    await this.prisma.$runCommandRaw({
      update: 'tipster_affiliate_landings',
      updates: [{
        q: { _id: { $oid: landingId } },
        u: { $inc: { total_clicks: 1 } },
      }],
    });

    // También registrar en affiliate_click_events para compatibilidad
    await this.prisma.$runCommandRaw({
      insert: 'affiliate_click_events',
      documents: [{
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
      }],
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
    const landingResult = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { slug, is_active: true },
      limit: 1,
    }) as any;

    const landing = landingResult.cursor?.firstBatch?.[0];
    if (!landing) return;

    const landingId = landing._id.$oid || landing._id.toString();
    const now = new Date().toISOString();

    // Registrar impresión
    await this.prisma.$runCommandRaw({
      insert: 'landing_impression_events',
      documents: [{
        _id: new ObjectId(),
        tipster_id: landing.tipster_id,
        landing_id: landingId,
        country_context: countryCode,
        anonymous_session_id: anonymousSessionId || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        referrer: referrer || null,
        created_at: { $date: now },
      }],
    });

    // Actualizar contador
    await this.prisma.$runCommandRaw({
      update: 'tipster_affiliate_landings',
      updates: [{
        q: { _id: { $oid: landingId } },
        u: { $inc: { total_impressions: 1 } },
      }],
    });
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

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = { $date: startDate.toISOString() };
    }
    if (endDate) {
      dateFilter.$lte = { $date: endDate.toISOString() };
    }

    // Clicks por país
    const clicksByCountry = await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: { landing_id: landingId, ...(Object.keys(dateFilter).length ? { created_at: dateFilter } : {}) } },
        { $group: { _id: '$country_context', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      cursor: {},
    }) as any;

    // Clicks por casa
    const clicksByHouse = await this.prisma.$runCommandRaw({
      aggregate: 'landing_click_events',
      pipeline: [
        { $match: { landing_id: landingId, ...(Object.keys(dateFilter).length ? { created_at: dateFilter } : {}) } },
        { $group: { _id: '$betting_house_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      cursor: {},
    }) as any;

    // Enriquecer clicks por casa con nombres
    const houseIds = (clicksByHouse.cursor?.firstBatch || []).map((c: any) => c._id);
    const houses = await this.getBettingHousesByIds(houseIds);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    return {
      landing: {
        id: landing.id,
        slug: landing.slug,
        title: landing.title,
        totalClicks: landing.totalClicks,
        totalImpressions: landing.totalImpressions,
      },
      clicksByCountry: (clicksByCountry.cursor?.firstBatch || []).map((c: any) => ({
        country: c._id,
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

    const result = await this.prisma.$runCommandRaw({
      find: 'landing_click_events',
      filter: { landing_id: landingId },
      sort: { created_at: -1 },
      skip,
      limit,
    }) as any;

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
        house: house ? {
          id: house.id,
          name: house.name,
          slug: house.slug,
        } : null,
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
      const existing = await this.prisma.$runCommandRaw({
        find: 'tipster_affiliate_landings',
        filter: { slug },
        limit: 1,
      }) as any;

      if (!existing.cursor?.firstBatch?.length) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async getBettingHouseById(houseId: string) {
    // Intentar con string ID primero
    let result = await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { _id: houseId },
      limit: 1,
    }) as any;

    if (!result.cursor?.firstBatch?.length) {
      // Intentar con ObjectId
      result = await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: { $oid: houseId } },
        limit: 1,
      }) as any;
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
    const result = await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { status: 'ACTIVE' },
    }) as any;

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
        status: h.status,
        masterAffiliateUrl: h.master_affiliate_url,
        trackingParamName: h.tracking_param_name || 'subid',
        description: h.description,
        websiteUrl: h.website_url,
        allowedCountries: h.allowed_countries || [],
      }));
  }

  private buildRedirectUrl(house: any, tipsterId: string, clickId: string, countryCode: string): string {
    // TODO: Implementar urlByCountry desde tracking config
    let baseUrl = house.masterAffiliateUrl;

    // Verificar si hay URL específica por país
    // Por ahora usamos la URL maestra

    const url = new URL(baseUrl);
    
    // Añadir parámetros de tracking
    url.searchParams.set(house.trackingParamName || 'subid', tipsterId);
    url.searchParams.set('clickid', clickId);

    return url.toString();
  }

  /**
   * Obtener casas de apuestas disponibles para un país
   */
  async getAvailableHousesForCountry(country: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { status: 'ACTIVE' },
    }) as any;

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
