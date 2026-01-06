import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.order.create({ data });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async findByClient(clientUserId: string) {
    return this.prisma.order.findMany({
      where: { clientUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(orderId: string, status: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async grantAccess(orderId: string, clientUserId: string, channelId: string) {
    // Update order status
    await this.updateStatus(orderId, 'ACCESS_GRANTED');

    // Create access grant
    return this.prisma.channelAccessGrant.create({
      data: {
        orderId,
        clientUserId,
        channelId,
        status: 'GRANTED',
        joinedAt: new Date(),
      },
    });
  }

  /**
   * Get sales for a tipster
   */
  async findSalesByTipster(userId: string) {
    try {
      // First get the tipster profile
      const tipster = await this.prisma.tipsterProfile.findUnique({
        where: { userId },
      });

      if (!tipster) {
        return [];
      }

      // Get all orders for this tipster
      const result = (await this.prisma.$runCommandRaw({
        find: 'orders',
        filter: {
          tipster_id: tipster.id,
          status: 'PAGADA',
        },
        sort: { created_at: -1 },
        limit: 100,
      })) as any;

      const orders = result.cursor?.firstBatch || [];

      // Map orders to a cleaner format
      return orders.map((order: any) => ({
        id: order._id.$oid || order._id,
        productId: order.product_id,
        amountCents: order.amount_cents,
        currency: order.currency,
        status: order.status,
        email: order.email_backup,
        telegramUsername: order.telegram_username,
        paymentProvider: order.payment_provider,
        paidAt: order.paid_at,
        createdAt: order.created_at,
      }));
    } catch (error) {
      this.logger.error('Error finding sales by tipster:', error);
      return [];
    }
  }

  /**
   * Get stats for a tipster (with gross/net breakdown)
   */
  async getStatsByTipster(userId: string) {
    try {
      // First get the tipster profile
      const tipster = await this.prisma.tipsterProfile.findUnique({
        where: { userId },
      });

      if (!tipster) {
        return {
          totalSales: 0,
          grossEarningsCents: 0,
          netEarningsCents: 0,
          gatewayFeesCents: 0,
          platformFeesCents: 0,
          currency: 'EUR',
          lastSaleAt: null,
        };
      }

      // Aggregate sales with commission breakdown
      const result = (await this.prisma.$runCommandRaw({
        aggregate: 'orders',
        pipeline: [
          { $match: { tipster_id: tipster.id, status: { $in: ['PAGADA', 'ACCESS_GRANTED'] } } },
          {
            $group: {
              _id: null,
              totalSales: { $sum: 1 },
              grossEarningsCents: { $sum: '$amount_cents' },
              netEarningsCents: { $sum: { $ifNull: ['$net_amount_cents', '$amount_cents'] } },
              gatewayFeesCents: { $sum: { $ifNull: ['$gateway_fee_cents', 0] } },
              platformFeesCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
              lastSaleAt: { $max: '$paid_at' },
            },
          },
        ],
        cursor: {},
      })) as any;

      const stats = result.cursor?.firstBatch?.[0] || {
        totalSales: 0,
        grossEarningsCents: 0,
        netEarningsCents: 0,
        gatewayFeesCents: 0,
        platformFeesCents: 0,
        lastSaleAt: null,
      };

      return {
        totalSales: stats.totalSales || 0,
        grossEarningsCents: stats.grossEarningsCents || 0,
        netEarningsCents: stats.netEarningsCents || 0,
        gatewayFeesCents: stats.gatewayFeesCents || 0,
        platformFeesCents: stats.platformFeesCents || 0,
        // Keep legacy field for backward compatibility
        totalEarningsCents: stats.netEarningsCents || stats.grossEarningsCents || 0,
        currency: 'EUR',
        lastSaleAt: stats.lastSaleAt,
      };
    } catch (error) {
      this.logger.error('Error getting stats by tipster:', error);
      return {
        totalSales: 0,
        grossEarningsCents: 0,
        netEarningsCents: 0,
        gatewayFeesCents: 0,
        platformFeesCents: 0,
        totalEarningsCents: 0,
        currency: 'EUR',
        lastSaleAt: null,
      };
    }
  }
}
