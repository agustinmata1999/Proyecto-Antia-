import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Frecuencias de liquidación
const SETTLEMENT_FREQUENCY = {
  FORECASTS: 7, // días (cada 7 días)
  AFFILIATE: 30, // días (1 vez al mes)
};

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener resumen de liquidaciones pendientes para un tipster
   */
  async getPendingSummary(tipsterId: string) {
    const now = new Date();
    
    // Calcular período actual de pronósticos (últimos 7 días)
    const forecastPeriodStart = new Date(now);
    forecastPeriodStart.setDate(forecastPeriodStart.getDate() - SETTLEMENT_FREQUENCY.FORECASTS);

    // Obtener órdenes del período actual
    const ordersResult = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        {
          $match: {
            tipster_id: tipsterId,
            status: { $in: ['PAGADA', 'ACCESS_GRANTED', 'COMPLETED', 'paid'] },
            created_at: { $gte: { $date: forecastPeriodStart.toISOString() } },
          },
        },
        {
          $group: {
            _id: null,
            grossAmountCents: { $sum: '$amount_cents' },
            gatewayFeesCents: { $sum: { $ifNull: ['$gateway_fee_cents', 0] } },
            platformFeesCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
            netAmountCents: { $sum: { $ifNull: ['$net_amount_cents', '$amount_cents'] } },
            orderCount: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    }) as any;

    const forecastStats = ordersResult.cursor?.firstBatch?.[0] || {
      grossAmountCents: 0,
      gatewayFeesCents: 0,
      platformFeesCents: 0,
      netAmountCents: 0,
      orderCount: 0,
    };

    // Calcular próxima fecha de liquidación (próximo domingo)
    const nextSettlementDate = this.getNextSettlementDate();

    // Obtener ingresos de afiliación del mes actual
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const affiliateResult = await this.prisma.$runCommandRaw({
      aggregate: 'affiliate_earnings',
      pipeline: [
        {
          $match: {
            tipster_id: tipsterId,
            period_month: currentMonth,
            status: { $in: ['PENDING', 'CONFIRMED'] },
          },
        },
        {
          $group: {
            _id: null,
            totalEarningsCents: { $sum: '$total_earnings_cents' },
            clientCount: { $sum: '$client_count' },
          },
        },
      ],
      cursor: {},
    }) as any;

    const affiliateStats = affiliateResult.cursor?.firstBatch?.[0] || {
      totalEarningsCents: 0,
      clientCount: 0,
    };

    return {
      forecasts: {
        periodStart: forecastPeriodStart,
        periodEnd: now,
        grossAmountCents: forecastStats.grossAmountCents,
        gatewayFeesCents: forecastStats.gatewayFeesCents,
        platformFeesCents: forecastStats.platformFeesCents,
        netAmountCents: forecastStats.netAmountCents,
        orderCount: forecastStats.orderCount,
        nextSettlementDate,
        frequency: 'Cada 7 días',
      },
      affiliate: {
        periodMonth: currentMonth,
        totalEarningsCents: affiliateStats.totalEarningsCents,
        clientCount: affiliateStats.clientCount,
        platformFeeCents: 0, // Sin comisión Antia
        netAmountCents: affiliateStats.totalEarningsCents,
        frequency: '1 vez al mes',
      },
      totalPendingCents: forecastStats.netAmountCents + affiliateStats.totalEarningsCents,
    };
  }

  /**
   * Obtener historial de liquidaciones de un tipster
   */
  async getSettlementHistory(tipsterId: string, limit = 20) {
    const result = await this.prisma.$runCommandRaw({
      find: 'settlements',
      filter: { tipster_id: tipsterId },
      sort: { created_at: -1 },
      limit,
    }) as any;

    return (result.cursor?.firstBatch || []).map((doc: any) => ({
      id: doc._id.$oid || doc._id,
      type: doc.type,
      periodStart: doc.period_start,
      periodEnd: doc.period_end,
      grossAmountCents: doc.gross_amount_cents,
      gatewayFeesCents: doc.gateway_fees_cents,
      platformFeesCents: doc.platform_fees_cents,
      netAmountCents: doc.net_amount_cents,
      orderCount: doc.order_count,
      status: doc.status,
      paidAt: doc.paid_at,
      paymentMethod: doc.payment_method,
      paymentReference: doc.payment_reference,
      createdAt: doc.created_at,
    }));
  }

  /**
   * Obtener total liquidado histórico
   */
  async getTotalPaidOut(tipsterId: string) {
    const result = await this.prisma.$runCommandRaw({
      aggregate: 'settlements',
      pipeline: [
        {
          $match: {
            tipster_id: tipsterId,
            status: 'PAID',
          },
        },
        {
          $group: {
            _id: null,
            totalNetCents: { $sum: '$net_amount_cents' },
            count: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    }) as any;

    const stats = result.cursor?.firstBatch?.[0] || { totalNetCents: 0, count: 0 };
    return {
      totalPaidOutCents: stats.totalNetCents,
      settlementCount: stats.count,
    };
  }

  /**
   * Crear una nueva liquidación (para uso interno/admin)
   */
  async createSettlement(data: {
    tipsterId: string;
    type: 'FORECASTS' | 'AFFILIATE';
    periodStart: Date;
    periodEnd: Date;
    grossAmountCents: number;
    gatewayFeesCents: number;
    platformFeesCents: number;
    netAmountCents: number;
    orderCount: number;
    notes?: string;
  }) {
    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      insert: 'settlements',
      documents: [{
        tipster_id: data.tipsterId,
        type: data.type,
        period_start: { $date: data.periodStart.toISOString() },
        period_end: { $date: data.periodEnd.toISOString() },
        gross_amount_cents: data.grossAmountCents,
        gateway_fees_cents: data.gatewayFeesCents,
        platform_fees_cents: data.platformFeesCents,
        net_amount_cents: data.netAmountCents,
        order_count: data.orderCount,
        status: 'PENDING',
        notes: data.notes || null,
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
    });

    this.logger.log(`Created settlement for tipster ${data.tipsterId}: ${data.type} - €${(data.netAmountCents / 100).toFixed(2)}`);
  }

  /**
   * Marcar liquidación como pagada (admin)
   */
  async markAsPaid(settlementId: string, paymentMethod: string, paymentReference: string) {
    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'settlements',
      updates: [{
        q: { _id: { $oid: settlementId } },
        u: {
          $set: {
            status: 'PAID',
            paid_at: { $date: now },
            payment_method: paymentMethod,
            payment_reference: paymentReference,
            updated_at: { $date: now },
          },
        },
      }],
    });

    this.logger.log(`Settlement ${settlementId} marked as PAID`);
  }

  /**
   * Calcular próxima fecha de liquidación (próximo domingo)
   */
  private getNextSettlementDate(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  }

  /**
   * Obtener desglose detallado para el dashboard del tipster
   */
  async getDetailedBreakdown(tipsterId: string) {
    const pending = await this.getPendingSummary(tipsterId);
    const history = await this.getSettlementHistory(tipsterId, 10);
    const totalPaid = await this.getTotalPaidOut(tipsterId);

    return {
      pending,
      history,
      totalPaid,
    };
  }
}
