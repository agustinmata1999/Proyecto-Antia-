import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) {}

  async create(tipsterId: string, dto: CreateProductDto) {
    // Use $runCommandRaw to bypass transaction requirement
    // IMPORTANT: Use snake_case field names to match Prisma @map() mapping in schema
    // IMPORTANT: Use { $date: ISOString } format for BSON dates
    const now = new Date().toISOString();
    const productData = {
      tipster_id: tipsterId, // snake_case to match Prisma mapping
      title: dto.title,
      description: dto.description || null,
      price_cents: dto.priceCents, // snake_case
      currency: dto.currency || 'EUR',
      billing_type: dto.billingType, // snake_case
      billing_period: dto.billingPeriod || null, // snake_case
      capacity_limit: dto.capacityLimit || null, // snake_case
      active: true,
      telegram_channel_id: dto.telegramChannelId || null, // snake_case
      access_mode: dto.accessMode || 'AUTO_JOIN', // snake_case
      validity_days: dto.validityDays || null, // snake_case
      created_at: { $date: now }, // BSON date format
      updated_at: { $date: now }, // BSON date format
    };

    // Insert directly using MongoDB driver to avoid transaction
    await this.prisma.$runCommandRaw({
      insert: 'products',
      documents: [productData],
    });

    // Fetch the most recently created product by this tipster with this title
    const products = await this.prisma.product.findMany({
      where: {
        tipsterId,
        title: dto.title,
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return products[0] || null;
  }

  async findAllByTipster(tipsterId: string) {
    return this.prisma.product.findMany({
      where: { tipsterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByUserId(userId: string) {
    // Get tipster profile first
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
    });

    if (!tipsterProfile) {
      return [];
    }

    return this.findAllByTipster(tipsterProfile.id);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, tipsterId: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }

    // Use $runCommandRaw to avoid transaction requirement
    // Convert DTO fields to snake_case for MongoDB
    // Use { $date: ISOString } format for BSON dates
    const updateData: any = { updated_at: { $date: new Date().toISOString() } };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priceCents !== undefined) updateData.price_cents = dto.priceCents;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.billingType !== undefined) updateData.billing_type = dto.billingType;
    if (dto.billingPeriod !== undefined) updateData.billing_period = dto.billingPeriod;
    if (dto.capacityLimit !== undefined) updateData.capacity_limit = dto.capacityLimit;
    if (dto.telegramChannelId !== undefined) updateData.telegram_channel_id = dto.telegramChannelId;
    if (dto.accessMode !== undefined) updateData.access_mode = dto.accessMode;
    if (dto.validityDays !== undefined) updateData.validity_days = dto.validityDays;

    await this.prisma.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: { _id: { $oid: id } },
          u: { $set: updateData },
        },
      ],
    });

    return this.findOne(id);
  }

  async publish(id: string, tipsterId: string) {
    const product = await this.findOne(id);
    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }

    // Use $runCommandRaw to avoid transaction requirement (snake_case for MongoDB)
    // Use { $date: ISOString } format for BSON dates
    await this.prisma.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: { _id: { $oid: id } },
          u: { $set: { active: true, updated_at: { $date: new Date().toISOString() } } },
        },
      ],
    });

    return this.findOne(id);
  }

  async pause(id: string, tipsterId: string) {
    const product = await this.findOne(id);
    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }

    // Use $runCommandRaw to avoid transaction requirement (snake_case for MongoDB)
    // Use { $date: ISOString } format for BSON dates
    await this.prisma.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: { _id: { $oid: id } },
          u: { $set: { active: false, updated_at: { $date: new Date().toISOString() } } },
        },
      ],
    });

    return this.findOne(id);
  }

  async getCheckoutLink(productId: string, tipsterId: string) {
    const product = await this.findOne(productId);

    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }

    const checkoutUrl = `${process.env.CHECKOUT_BASE_URL}?product_id=${productId}&tipster_id=${tipsterId}`;

    return {
      url: checkoutUrl,
      productId,
      tipsterId,
    };
  }

  async publishToTelegram(productId: string, userId: string, targetChannelId?: string) {
    try {
      // Dynamically resolve TelegramService to avoid circular dependency
      const { TelegramService } = await import('../telegram/telegram.service');
      const telegramService = this.moduleRef.get(TelegramService, { strict: false });

      // Get tipster profile
      const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
        where: { userId },
      });

      if (!tipsterProfile) {
        return {
          success: false,
          message: 'Perfil de tipster no encontrado',
        };
      }

      // Get product details
      const product = await this.findOne(productId);

      // Verify product belongs to this tipster
      if (product.tipsterId !== tipsterProfile.id) {
        return {
          success: false,
          message: 'No tienes permiso para publicar este producto',
        };
      }

      // Use the new publishProductToChannel method
      return telegramService.publishProductToChannel(tipsterProfile.id, productId, targetChannelId);
    } catch (error) {
      return {
        success: false,
        message: 'Error al publicar en Telegram: ' + error.message,
      };
    }
  }
}
