import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener perfil del cliente
   */
  async getProfile(userId: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'client_profiles',
      filter: { user_id: userId },
      limit: 1,
    })) as any;

    const profile = result.cursor?.firstBatch?.[0];

    if (!profile) {
      return null;
    }

    return {
      id: profile._id.$oid || profile._id,
      userId: profile.user_id,
      countryIso: profile.country_iso,
      telegramUserId: profile.telegram_user_id,
      consent18: profile.consent_18,
      consentTerms: profile.consent_terms,
      consentPrivacy: profile.consent_privacy,
      locale: profile.locale,
      timezone: profile.timezone,
      createdAt: profile.created_at,
    };
  }

  /**
   * Actualizar perfil del cliente
   */
  async updateProfile(
    userId: string,
    data: {
      countryIso?: string;
      telegramUserId?: string;
      locale?: string;
      timezone?: string;
    },
  ) {
    const profile = await this.getProfile(userId);

    if (!profile) {
      return { success: false, message: 'Perfil no encontrado' };
    }

    const updateFields: any = {
      updated_at: { $date: new Date().toISOString() },
    };

    if (data.countryIso) updateFields.country_iso = data.countryIso;
    if (data.telegramUserId) updateFields.telegram_user_id = data.telegramUserId;
    if (data.locale) updateFields.locale = data.locale;
    if (data.timezone) updateFields.timezone = data.timezone;

    await this.prisma.$runCommandRaw({
      update: 'client_profiles',
      updates: [
        {
          q: { user_id: userId },
          u: { $set: updateFields },
        },
      ],
    });

    return { success: true, message: 'Perfil actualizado' };
  }

  /**
   * Obtener compras del cliente con detalles
   */
  async getPurchases(userId: string) {
    // Get orders
    const ordersResult = (await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: { client_user_id: userId },
      sort: { created_at: -1 },
    })) as any;

    const orders = ordersResult.cursor?.firstBatch || [];

    // Enrich with product and tipster info
    const purchases = await Promise.all(
      orders.map(async (order: any) => {
        // Get product
        let product = null;
        if (order.product_id) {
          const productResult = (await this.prisma.$runCommandRaw({
            find: 'products',
            filter: { _id: { $oid: order.product_id } },
            limit: 1,
          })) as any;
          product = productResult.cursor?.firstBatch?.[0];
        }

        // Get tipster name
        let tipsterName = 'Tipster';
        if (order.tipster_id) {
          const tipsterResult = (await this.prisma.$runCommandRaw({
            find: 'tipster_profiles',
            filter: { _id: { $oid: order.tipster_id } },
            projection: { public_name: 1 },
            limit: 1,
          })) as any;
          const tipster = tipsterResult.cursor?.firstBatch?.[0];
          if (tipster) tipsterName = tipster.public_name;
        }

        // Calculate expiration
        let expiresAt = null;
        let isExpired = false;
        if (product?.validity_days && order.created_at) {
          const createdDate = new Date(order.created_at.$date || order.created_at);
          expiresAt = new Date(createdDate.getTime() + product.validity_days * 24 * 60 * 60 * 1000);
          isExpired = new Date() > expiresAt;
        }

        // Determine status
        let displayStatus = 'PENDING';
        if (order.status === 'ACCESS_GRANTED') {
          displayStatus = isExpired ? 'EXPIRED' : 'ACTIVE';
        } else if (order.status === 'PAGADA' || order.status === 'PAGADA_SIN_ACCESO') {
          displayStatus = 'PENDING_ACCESS';
        } else if (order.status === 'REFUNDED') {
          displayStatus = 'REFUNDED';
        }

        return {
          id: order._id.$oid || order._id,
          productId: order.product_id,
          productTitle: product?.title || 'Producto',
          productDescription: product?.description,
          tipsterName,
          amountCents: order.amount_cents,
          currency: order.currency || 'EUR',
          originalCurrency: order.original_currency,
          originalAmountCents: order.original_amount_cents,
          paymentProvider: order.payment_provider,
          paymentMethod: order.payment_method,
          status: displayStatus,
          rawStatus: order.status,
          validityDays: product?.validity_days,
          expiresAt: expiresAt?.toISOString(),
          isExpired,
          telegramChannelId: product?.telegram_channel_id,
          accessMode: product?.access_mode,
          createdAt: order.created_at?.$date || order.created_at,
        };
      }),
    );

    return purchases;
  }

  /**
   * Obtener detalles de una compra específica
   */
  async getPurchaseDetails(userId: string, orderId: string) {
    const orderResult = (await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: {
        _id: { $oid: orderId },
        client_user_id: userId,
      },
      limit: 1,
    })) as any;

    const order = orderResult.cursor?.firstBatch?.[0];

    if (!order) {
      return null;
    }

    // Get product details
    let product = null;
    let telegramChannel = null;

    if (order.product_id) {
      const productResult = (await this.prisma.$runCommandRaw({
        find: 'products',
        filter: { _id: { $oid: order.product_id } },
        limit: 1,
      })) as any;
      product = productResult.cursor?.firstBatch?.[0];

      // Get telegram channel if exists
      if (product?.telegram_channel_id) {
        const channelResult = (await this.prisma.$runCommandRaw({
          find: 'telegram_channels',
          filter: { channel_id: product.telegram_channel_id },
          limit: 1,
        })) as any;
        telegramChannel = channelResult.cursor?.firstBatch?.[0];
      }
    }

    // Get tipster info
    let tipster = null;
    if (order.tipster_id) {
      const tipsterResult = (await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $oid: order.tipster_id } },
        projection: { public_name: 1, telegram_username: 1 },
        limit: 1,
      })) as any;
      tipster = tipsterResult.cursor?.firstBatch?.[0];
    }

    return {
      order: {
        id: order._id.$oid || order._id,
        amountCents: order.amount_cents,
        currency: order.currency,
        status: order.status,
        paymentProvider: order.payment_provider,
        paymentMethod: order.payment_method,
        createdAt: order.created_at?.$date || order.created_at,
      },
      product: product
        ? {
            id: product._id.$oid || product._id,
            title: product.title,
            description: product.description,
            validityDays: product.validity_days,
            accessMode: product.access_mode,
          }
        : null,
      tipster: tipster
        ? {
            name: tipster.public_name,
            telegramUsername: tipster.telegram_username,
          }
        : null,
      telegramChannel: telegramChannel
        ? {
            id: telegramChannel.channel_id,
            title: telegramChannel.channel_title,
            type: telegramChannel.channel_type,
            inviteLink: telegramChannel.invite_link,
          }
        : null,
    };
  }

  /**
   * Obtener historial de pagos/facturas
   */
  async getPaymentHistory(userId: string) {
    const ordersResult = (await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: {
        client_user_id: userId,
        status: { $in: ['PAGADA', 'PAGADA_SIN_ACCESO', 'ACCESS_GRANTED', 'REFUNDED'] },
      },
      sort: { created_at: -1 },
    })) as any;

    const orders = ordersResult.cursor?.firstBatch || [];

    return orders.map((order: any) => ({
      id: order._id.$oid || order._id,
      amountCents: order.amount_cents,
      currency: order.currency || 'EUR',
      originalCurrency: order.original_currency,
      originalAmountCents: order.original_amount_cents,
      paymentProvider: order.payment_provider,
      paymentMethod: order.payment_method,
      status: order.status,
      createdAt: order.created_at?.$date || order.created_at,
    }));
  }

  /**
   * Obtener suscripciones activas del cliente
   */
  async getSubscriptions(userId: string) {
    // Get orders with subscription billing type
    const ordersResult = (await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: {
        client_user_id: userId,
        billing_type: 'SUBSCRIPTION',
        status: { $in: ['PAGADA', 'ACCESS_GRANTED'] },
      },
      sort: { created_at: -1 },
    })) as any;

    const orders = ordersResult.cursor?.firstBatch || [];

    // Enrich with product info
    const subscriptions = await Promise.all(
      orders.map(async (order: any) => {
        let product = null;
        let tipster = null;

        if (order.product_id) {
          const productResult = (await this.prisma.$runCommandRaw({
            find: 'products',
            filter: { _id: { $oid: order.product_id } },
            limit: 1,
          })) as any;
          product = productResult.cursor?.firstBatch?.[0];
        }

        if (order.tipster_id) {
          const tipsterResult = (await this.prisma.$runCommandRaw({
            find: 'tipster_profiles',
            filter: { _id: { $oid: order.tipster_id } },
            projection: { public_name: 1 },
            limit: 1,
          })) as any;
          tipster = tipsterResult.cursor?.firstBatch?.[0];
        }

        // Calculate current period
        const createdAt = new Date(order.created_at?.$date || order.created_at);
        const interval = order.subscription_interval || product?.subscription_interval || 'MONTHLY';
        let periodDays = 30;
        if (interval === 'QUARTERLY') periodDays = 90;
        if (interval === 'ANNUAL') periodDays = 365;

        const currentPeriodEnd = new Date(createdAt);
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + periodDays);

        return {
          id: order._id.$oid || order._id,
          productId: order.product_id,
          productTitle: product?.title || 'Producto',
          tipsterName: tipster?.public_name || 'Tipster',
          status: order.subscription_status || 'active',
          billingInterval: interval,
          amountCents: order.amount_cents,
          currency: order.currency || 'EUR',
          currentPeriodStart: createdAt.toISOString(),
          currentPeriodEnd: currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: order.cancel_at_period_end || false,
          telegramChannelId: product?.telegram_channel_id,
          createdAt: createdAt.toISOString(),
        };
      }),
    );

    return subscriptions;
  }

  /**
   * Cancelar una suscripción
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    // Verify the order belongs to the user
    const orderResult = (await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: {
        _id: { $oid: subscriptionId },
        client_user_id: userId,
        billing_type: 'SUBSCRIPTION',
      },
      limit: 1,
    })) as any;

    const order = orderResult.cursor?.firstBatch?.[0];

    if (!order) {
      return { success: false, message: 'Suscripción no encontrada' };
    }

    // Mark as cancel at period end (don't revoke access immediately)
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: subscriptionId } },
          u: {
            $set: {
              cancel_at_period_end: true,
              canceled_at: new Date().toISOString(),
            },
          },
        },
      ],
    });

    // TODO: If using Stripe subscriptions, also cancel on Stripe
    // await this.stripeService.cancelSubscription(order.stripe_subscription_id);

    this.logger.log(`Subscription ${subscriptionId} canceled for user ${userId}`);

    return {
      success: true,
      message: 'Suscripción cancelada. Mantendrás el acceso hasta el final del periodo actual.',
    };
  }
}
