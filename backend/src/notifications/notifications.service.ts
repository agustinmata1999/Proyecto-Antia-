import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../emails/emails.service';
import { ConfigService } from '@nestjs/config';

export type NotificationType = 
  | 'SALE'
  | 'SUBSCRIPTION_NEW'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SETTLEMENT'
  | 'PAYOUT'
  | 'SYSTEM';

export interface CreateNotificationDto {
  userId: string;
  tipsterId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {
    this.appUrl = this.config.get<string>('APP_URL') || 'https://antia.com';
  }

  /**
   * Create a notification and optionally send email
   */
  async createNotification(dto: CreateNotificationDto): Promise<any> {
    const notification = {
      id: this.generateId(),
      user_id: dto.userId,
      tipster_id: dto.tipsterId || null,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata || {},
      is_read: false,
      created_at: new Date().toISOString(),
    };

    try {
      await this.prisma.$runCommandRaw({
        insert: 'notifications',
        documents: [notification],
      });

      this.logger.log(`📬 Notification created: ${dto.type} for user ${dto.userId}`);
      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error.message);
      throw error;
    }
  }

  /**
   * Get notifications for a user (tipster)
   */
  async getNotifications(userId: string, options: { limit?: number; unreadOnly?: boolean } = {}) {
    const { limit = 50, unreadOnly = false } = options;

    const filter: any = { user_id: userId };
    if (unreadOnly) filter.is_read = false;

    const result = await this.prisma.$runCommandRaw({
      find: 'notifications',
      filter,
      sort: { created_at: -1 },
      limit,
      projection: { _id: 0 },
    }) as any;

    return result.cursor?.firstBatch || [];
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.prisma.$runCommandRaw({
      count: 'notifications',
      query: { user_id: userId, is_read: false },
    }) as any;

    return result.n || 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.$runCommandRaw({
      update: 'notifications',
      updates: [{
        q: { id: notificationId, user_id: userId },
        u: { $set: { is_read: true, read_at: new Date().toISOString() } },
      }],
    }) as any;

    return result.nModified > 0;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.$runCommandRaw({
      update: 'notifications',
      updates: [{
        q: { user_id: userId, is_read: false },
        u: { $set: { is_read: true, read_at: new Date().toISOString() } },
        multi: true,
      }],
    }) as any;

    return result.nModified || 0;
  }

  /**
   * =============================================
   * CONVENIENCE METHODS FOR SPECIFIC EVENTS
   * =============================================
   */

  /**
   * Notify tipster of new sale + send email
   */
  async notifyNewSale(data: {
    tipsterId: string;
    tipsterUserId: string;
    tipsterEmail: string;
    productName: string;
    billingType: 'ONE_TIME' | 'SUBSCRIPTION';
    netAmount: number;
    currency: string;
    orderId: string;
  }) {
    // Create notification
    await this.createNotification({
      userId: data.tipsterUserId,
      tipsterId: data.tipsterId,
      type: 'SALE',
      title: 'Nueva venta',
      message: `Vendiste ${data.productName}`,
      metadata: {
        productName: data.productName,
        netAmount: data.netAmount,
        currency: data.currency,
        orderId: data.orderId,
      },
    });

    // Send email
    await this.emailService.sendNewSaleNotification({
      tipsterEmail: data.tipsterEmail,
      productName: data.productName,
      billingType: data.billingType,
      saleDate: new Date(),
      netAmount: data.netAmount,
      currency: data.currency,
      orderId: data.orderId,
      panelUrl: `${this.appUrl}/dashboard/tipster`,
    });
  }

  /**
   * Notify tipster of new subscription
   */
  async notifySubscriptionStarted(data: {
    tipsterId: string;
    tipsterUserId: string;
    tipsterEmail: string;
    productName: string;
    clientEmail: string;
    billingPeriod: string;
  }) {
    await this.createNotification({
      userId: data.tipsterUserId,
      tipsterId: data.tipsterId,
      type: 'SUBSCRIPTION_NEW',
      title: 'Nueva suscripción',
      message: `Nuevo suscriptor en ${data.productName}`,
      metadata: { productName: data.productName },
    });

    await this.emailService.sendTipsterSubscriptionStarted({
      tipsterEmail: data.tipsterEmail,
      productName: data.productName,
      clientEmail: data.clientEmail,
      billingPeriod: data.billingPeriod,
    });
  }

  /**
   * Notify tipster of subscription cancellation
   */
  async notifySubscriptionCancelled(data: {
    tipsterId: string;
    tipsterUserId: string;
    tipsterEmail: string;
    productName: string;
    clientEmail: string;
  }) {
    await this.createNotification({
      userId: data.tipsterUserId,
      tipsterId: data.tipsterId,
      type: 'SUBSCRIPTION_CANCELLED',
      title: 'Suscripción cancelada',
      message: `Un cliente canceló ${data.productName}`,
      metadata: { productName: data.productName },
    });

    await this.emailService.sendTipsterSubscriptionCancelled({
      tipsterEmail: data.tipsterEmail,
      productName: data.productName,
      clientEmail: data.clientEmail,
    });
  }

  /**
   * Notify tipster of subscription expiration
   */
  async notifySubscriptionExpired(data: {
    tipsterId: string;
    tipsterUserId: string;
    tipsterEmail: string;
    productName: string;
    clientEmail: string;
  }) {
    await this.createNotification({
      userId: data.tipsterUserId,
      tipsterId: data.tipsterId,
      type: 'SUBSCRIPTION_EXPIRED',
      title: 'Suscripción expirada',
      message: `Expiró suscripción de ${data.productName}`,
      metadata: { productName: data.productName },
    });

    await this.emailService.sendTipsterSubscriptionExpired({
      tipsterEmail: data.tipsterEmail,
      productName: data.productName,
      clientEmail: data.clientEmail,
    });
  }

  /**
   * Notify settlement available
   */
  async notifySettlementAvailable(data: {
    tipsterId: string;
    tipsterUserId: string;
    amount: number;
    currency: string;
  }) {
    await this.createNotification({
      userId: data.tipsterUserId,
      tipsterId: data.tipsterId,
      type: 'SETTLEMENT',
      title: 'Liquidación disponible',
      message: `Tienes ${(data.amount / 100).toFixed(2)} ${data.currency} pendientes`,
      metadata: { amount: data.amount, currency: data.currency },
    });
  }

  /**
   * Notify payout processed
   */
  async notifyPayoutProcessed(data: {
    tipsterId: string;
    tipsterUserId: string;
    amount: number;
    currency: string;
  }) {
    await this.createNotification({
      userId: data.tipsterUserId,
      tipsterId: data.tipsterId,
      type: 'PAYOUT',
      title: 'Pago procesado',
      message: `Se procesó tu pago de ${(data.amount / 100).toFixed(2)} ${data.currency}`,
      metadata: { amount: data.amount, currency: data.currency },
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
