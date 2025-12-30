import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectId } from 'mongodb';

export interface CreatePromotionDto {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  houseLinks: Array<{
    bettingHouseId: string;
    affiliateUrl: string;
    trackingParamName?: string;
  }>;
}

export interface UpdatePromotionDto {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateHouseLinkDto {
  affiliateUrl?: string;
  trackingParamName?: string;
  isActive?: boolean;
}

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  // ==================== PROMOCIONES CRUD ====================

  /**
   * Crear una nueva promoción/reto
   */
  async createPromotion(adminId: string, dto: CreatePromotionDto) {
    // Generar slug
    const slug = this.generateSlug(dto.name);
    const uniqueSlug = await this.ensureUniqueSlug(slug);

    const now = new Date().toISOString();
    const promotionId = new ObjectId();

    // Crear la promoción
    await this.prisma.$runCommandRaw({
      insert: 'affiliate_promotions',
      documents: [{
        _id: promotionId,
        name: dto.name,
        description: dto.description || null,
        slug: uniqueSlug,
        status: 'ACTIVE',
        start_date: dto.startDate ? { $date: dto.startDate } : null,
        end_date: dto.endDate ? { $date: dto.endDate } : null,
        created_by: adminId,
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
    });

    // Crear los links de las casas
    if (dto.houseLinks && dto.houseLinks.length > 0) {
      const linkDocuments = dto.houseLinks.map(link => ({
        _id: new ObjectId(),
        promotion_id: promotionId.toHexString(),
        betting_house_id: link.bettingHouseId,
        affiliate_url: link.affiliateUrl,
        tracking_param_name: link.trackingParamName || null,
        is_active: true,
        created_at: { $date: now },
        updated_at: { $date: now },
      }));

      await this.prisma.$runCommandRaw({
        insert: 'promotion_house_links',
        documents: linkDocuments,
      });
    }

    return {
      id: promotionId.toHexString(),
      name: dto.name,
      slug: uniqueSlug,
      status: 'ACTIVE',
    };
  }

  /**
   * Obtener todas las promociones
   */
  async getAllPromotions() {
    const result = await this.prisma.$runCommandRaw({
      find: 'affiliate_promotions',
      sort: { created_at: -1 },
    }) as any;

    const promotions = result.cursor?.firstBatch || [];

    // Para cada promoción, contar los links
    const enriched = await Promise.all(promotions.map(async (p: any) => {
      const promotionId = p._id.$oid || p._id.toString();
      
      const linksResult = await this.prisma.$runCommandRaw({
        find: 'promotion_house_links',
        filter: { promotion_id: promotionId },
      }) as any;

      const links = linksResult.cursor?.firstBatch || [];

      return {
        id: promotionId,
        name: p.name,
        description: p.description,
        slug: p.slug,
        status: p.status,
        startDate: p.start_date?.$date || p.start_date,
        endDate: p.end_date?.$date || p.end_date,
        housesCount: links.length,
        createdAt: p.created_at?.$date || p.created_at,
      };
    }));

    return enriched;
  }

  /**
   * Obtener promociones activas (para tipsters)
   */
  async getActivePromotions() {
    const result = await this.prisma.$runCommandRaw({
      find: 'affiliate_promotions',
      filter: { status: 'ACTIVE' },
      sort: { created_at: -1 },
    }) as any;

    const promotions = result.cursor?.firstBatch || [];

    return promotions.map((p: any) => ({
      id: p._id.$oid || p._id.toString(),
      name: p.name,
      description: p.description,
      slug: p.slug,
    }));
  }

  /**
   * Obtener detalle de una promoción
   */
  async getPromotionById(promotionId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'affiliate_promotions',
      filter: { _id: { $oid: promotionId } },
      limit: 1,
    }) as any;

    const promotion = result.cursor?.firstBatch?.[0];
    if (!promotion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    // Obtener los links de las casas
    const linksResult = await this.prisma.$runCommandRaw({
      find: 'promotion_house_links',
      filter: { promotion_id: promotionId },
    }) as any;

    const links = linksResult.cursor?.firstBatch || [];

    // Enriquecer con info de las casas
    const houseIds = links.map((l: any) => l.betting_house_id);
    const houses = await this.getBettingHousesByIds(houseIds);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    const enrichedLinks = links.map((link: any) => {
      const house: any = housesMap.get(link.betting_house_id);
      return {
        id: link._id.$oid || link._id.toString(),
        bettingHouseId: link.betting_house_id,
        affiliateUrl: link.affiliate_url,
        trackingParamName: link.tracking_param_name,
        isActive: link.is_active,
        house: house ? {
          id: house.id,
          name: house.name,
          slug: house.slug,
          logoUrl: house.logoUrl,
        } : null,
      };
    });

    return {
      id: promotion._id.$oid || promotion._id.toString(),
      name: promotion.name,
      description: promotion.description,
      slug: promotion.slug,
      status: promotion.status,
      startDate: promotion.start_date?.$date || promotion.start_date,
      endDate: promotion.end_date?.$date || promotion.end_date,
      houseLinks: enrichedLinks,
      createdAt: promotion.created_at?.$date || promotion.created_at,
    };
  }

  /**
   * Actualizar una promoción
   */
  async updatePromotion(promotionId: string, dto: UpdatePromotionDto) {
    const now = new Date().toISOString();
    const updateFields: any = { updated_at: { $date: now } };

    if (dto.name !== undefined) updateFields.name = dto.name;
    if (dto.description !== undefined) updateFields.description = dto.description;
    if (dto.status !== undefined) updateFields.status = dto.status;
    if (dto.startDate !== undefined) updateFields.start_date = dto.startDate ? { $date: dto.startDate } : null;
    if (dto.endDate !== undefined) updateFields.end_date = dto.endDate ? { $date: dto.endDate } : null;

    await this.prisma.$runCommandRaw({
      update: 'affiliate_promotions',
      updates: [{
        q: { _id: { $oid: promotionId } },
        u: { $set: updateFields },
      }],
    });

    return this.getPromotionById(promotionId);
  }

  /**
   * Eliminar una promoción
   */
  async deletePromotion(promotionId: string) {
    // Verificar si hay landings usando esta promoción
    const landingsResult = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_landings',
      filter: { promotion_id: promotionId },
      limit: 1,
    }) as any;

    if (landingsResult.cursor?.firstBatch?.length > 0) {
      throw new BadRequestException('No se puede eliminar la promoción porque hay landings que la usan');
    }

    // Eliminar links
    await this.prisma.$runCommandRaw({
      delete: 'promotion_house_links',
      deletes: [{
        q: { promotion_id: promotionId },
        limit: 0,
      }],
    });

    // Eliminar promoción
    await this.prisma.$runCommandRaw({
      delete: 'affiliate_promotions',
      deletes: [{
        q: { _id: { $oid: promotionId } },
        limit: 1,
      }],
    });

    return { success: true };
  }

  // ==================== HOUSE LINKS ====================

  /**
   * Añadir link de casa a una promoción
   */
  async addHouseLink(promotionId: string, bettingHouseId: string, affiliateUrl: string, trackingParamName?: string) {
    // Verificar que no exista ya
    const existingResult = await this.prisma.$runCommandRaw({
      find: 'promotion_house_links',
      filter: { promotion_id: promotionId, betting_house_id: bettingHouseId },
      limit: 1,
    }) as any;

    if (existingResult.cursor?.firstBatch?.length > 0) {
      throw new BadRequestException('Esta casa ya está configurada en la promoción');
    }

    const now = new Date().toISOString();
    const linkId = new ObjectId();

    await this.prisma.$runCommandRaw({
      insert: 'promotion_house_links',
      documents: [{
        _id: linkId,
        promotion_id: promotionId,
        betting_house_id: bettingHouseId,
        affiliate_url: affiliateUrl,
        tracking_param_name: trackingParamName || null,
        is_active: true,
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
    });

    return { id: linkId.toHexString(), success: true };
  }

  /**
   * Actualizar link de casa
   */
  async updateHouseLink(linkId: string, dto: UpdateHouseLinkDto) {
    const now = new Date().toISOString();
    const updateFields: any = { updated_at: { $date: now } };

    if (dto.affiliateUrl !== undefined) updateFields.affiliate_url = dto.affiliateUrl;
    if (dto.trackingParamName !== undefined) updateFields.tracking_param_name = dto.trackingParamName;
    if (dto.isActive !== undefined) updateFields.is_active = dto.isActive;

    await this.prisma.$runCommandRaw({
      update: 'promotion_house_links',
      updates: [{
        q: { _id: { $oid: linkId } },
        u: { $set: updateFields },
      }],
    });

    return { success: true };
  }

  /**
   * Eliminar link de casa
   */
  async removeHouseLink(linkId: string) {
    await this.prisma.$runCommandRaw({
      delete: 'promotion_house_links',
      deletes: [{
        q: { _id: { $oid: linkId } },
        limit: 1,
      }],
    });

    return { success: true };
  }

  /**
   * Obtener casas disponibles de una promoción (para que el tipster seleccione)
   */
  async getPromotionHouses(promotionId: string) {
    const linksResult = await this.prisma.$runCommandRaw({
      find: 'promotion_house_links',
      filter: { promotion_id: promotionId, is_active: true },
    }) as any;

    const links = linksResult.cursor?.firstBatch || [];

    // Enriquecer con info de las casas
    const houseIds = links.map((l: any) => l.betting_house_id);
    const houses = await this.getBettingHousesByIds(houseIds);
    const housesMap = new Map(houses.map((h: any) => [h.id, h]));

    return links.map((link: any) => {
      const house: any = housesMap.get(link.betting_house_id);
      return {
        bettingHouseId: link.betting_house_id,
        affiliateUrl: link.affiliate_url,
        house: house ? {
          id: house.id,
          name: house.name,
          slug: house.slug,
          logoUrl: house.logoUrl,
          allowedCountries: house.allowedCountries,
        } : null,
      };
    }).filter((l: any) => l.house !== null);
  }

  /**
   * Obtener el link específico de una casa en una promoción
   */
  async getPromotionHouseLink(promotionId: string, bettingHouseId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'promotion_house_links',
      filter: { 
        promotion_id: promotionId, 
        betting_house_id: bettingHouseId,
        is_active: true,
      },
      limit: 1,
    }) as any;

    const link = result.cursor?.firstBatch?.[0];
    if (!link) {
      return null;
    }

    return {
      affiliateUrl: link.affiliate_url,
      trackingParamName: link.tracking_param_name,
    };
  }

  // ==================== HELPERS ====================

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.$runCommandRaw({
        find: 'affiliate_promotions',
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

  private async getBettingHousesByIds(houseIds: string[]) {
    if (!houseIds.length) return [];

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
        allowedCountries: h.allowed_countries || [],
      }));
  }
}
