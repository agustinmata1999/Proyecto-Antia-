import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Constantes de comisiones
const PLATFORM_FEE_STANDARD = 10; // 10% para < 100k EUR/mes
const PLATFORM_FEE_HIGH_VOLUME = 7; // 7% para >= 100k EUR/mes
const HIGH_VOLUME_THRESHOLD_CENTS = 10000000; // 100,000 EUR en centavos

// Comisiones de pasarelas (aproximadas)
const GATEWAY_FEES = {
  stripe: { percent: 2.9, fixedCents: 30 }, // 2.9% + 0.30€
  redsys: { percent: 0.5, fixedCents: 0 },  // ~0.5% variable
  stripe_simulated: { percent: 2.9, fixedCents: 30 },
  default: { percent: 2.5, fixedCents: 0 },
};

export interface CommissionCalculation {
  grossAmountCents: number;
  gatewayFeeCents: number;
  gatewayFeePercent: number;
  platformFeeCents: number;
  platformFeePercent: number;
  netAmountCents: number;
  tier: 'STANDARD' | 'HIGH_VOLUME' | 'CUSTOM';
}

export interface UpdateCommissionDto {
  customFeePercent?: number;
  useCustomFee?: boolean;
  autoTierEnabled?: boolean;
  notes?: string;
}

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calcular comisiones para una orden
   */
  async calculateCommissions(
    tipsterId: string,
    amountCents: number,
    paymentProvider: string,
  ): Promise<CommissionCalculation> {
    // 1. Calcular comisión de pasarela
    const gatewayFee = this.calculateGatewayFee(amountCents, paymentProvider);

    // 2. Obtener configuración de comisión del tipster
    const config = await this.getTipsterCommissionConfig(tipsterId);

    // 3. Calcular volumen mensual actual del tipster
    const monthlyVolume = await this.getMonthlyVolume(tipsterId);

    // 4. Determinar % de comisión de plataforma
    let platformFeePercent: number;
    let tier: 'STANDARD' | 'HIGH_VOLUME' | 'CUSTOM';

    if (config.useCustomFee && config.customFeePercent !== null) {
      // Usar comisión personalizada
      platformFeePercent = config.customFeePercent;
      tier = 'CUSTOM';
    } else if (config.autoTierEnabled) {
      // Aplicar tier automático basado en volumen
      if (monthlyVolume >= HIGH_VOLUME_THRESHOLD_CENTS) {
        platformFeePercent = PLATFORM_FEE_HIGH_VOLUME;
        tier = 'HIGH_VOLUME';
      } else {
        platformFeePercent = PLATFORM_FEE_STANDARD;
        tier = 'STANDARD';
      }
    } else {
      // Usar el valor por defecto de la config
      platformFeePercent = config.platformFeePercent;
      tier = 'STANDARD';
    }

    // 5. Calcular comisión de plataforma (sobre el bruto menos pasarela)
    const amountAfterGateway = amountCents - gatewayFee.feeCents;
    const platformFeeCents = Math.round(amountAfterGateway * (platformFeePercent / 100));

    // 6. Calcular neto
    const netAmountCents = amountCents - gatewayFee.feeCents - platformFeeCents;

    return {
      grossAmountCents: amountCents,
      gatewayFeeCents: gatewayFee.feeCents,
      gatewayFeePercent: gatewayFee.percent,
      platformFeeCents,
      platformFeePercent,
      netAmountCents,
      tier,
    };
  }

  /**
   * Calcular comisión de pasarela de pago
   */
  private calculateGatewayFee(amountCents: number, provider: string): { feeCents: number; percent: number } {
    const providerKey = provider?.toLowerCase() || 'default';
    const rates = GATEWAY_FEES[providerKey] || GATEWAY_FEES.default;

    const percentFee = Math.round(amountCents * (rates.percent / 100));
    const totalFee = percentFee + rates.fixedCents;

    return {
      feeCents: totalFee,
      percent: rates.percent,
    };
  }

  /**
   * Obtener o crear configuración de comisión para un tipster
   */
  async getTipsterCommissionConfig(tipsterId: string) {
    // Buscar configuración existente
    const existingResult = await this.prisma.$runCommandRaw({
      find: 'tipster_commission_configs',
      filter: { tipster_id: tipsterId },
      limit: 1,
    }) as any;

    const existing = existingResult.cursor?.firstBatch?.[0];

    if (existing) {
      return {
        id: existing._id.$oid || existing._id,
        tipsterId: existing.tipster_id,
        platformFeePercent: existing.platform_fee_percent || PLATFORM_FEE_STANDARD,
        customFeePercent: existing.custom_fee_percent,
        useCustomFee: existing.use_custom_fee || false,
        autoTierEnabled: existing.auto_tier_enabled !== false,
        notes: existing.notes,
      };
    }

    // Crear configuración por defecto
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      insert: 'tipster_commission_configs',
      documents: [{
        tipster_id: tipsterId,
        platform_fee_percent: PLATFORM_FEE_STANDARD,
        custom_fee_percent: null,
        use_custom_fee: false,
        auto_tier_enabled: true,
        notes: null,
        last_modified_by: null,
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
    });

    return {
      tipsterId,
      platformFeePercent: PLATFORM_FEE_STANDARD,
      customFeePercent: null,
      useCustomFee: false,
      autoTierEnabled: true,
      notes: null,
    };
  }

  /**
   * Obtener volumen mensual del tipster (mes actual)
   */
  async getMonthlyVolume(tipsterId: string): Promise<number> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        {
          $match: {
            tipster_id: tipsterId,
            status: { $in: ['PAGADA', 'COMPLETED', 'paid', 'ACCESS_GRANTED'] },
            created_at: {
              $gte: { $date: startOfMonth.toISOString() },
              $lte: { $date: endOfMonth.toISOString() },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount_cents' },
          },
        },
      ],
      cursor: {},
    }) as any;

    return result.cursor?.firstBatch?.[0]?.total || 0;
  }

  /**
   * Actualizar configuración de comisión (SuperAdmin)
   */
  async updateTipsterCommission(
    tipsterId: string,
    dto: UpdateCommissionDto,
    adminId: string,
    adminEmail: string,
  ) {
    // Obtener configuración actual
    const currentConfig = await this.getTipsterCommissionConfig(tipsterId);
    const previousPercent = currentConfig.useCustomFee 
      ? currentConfig.customFeePercent 
      : currentConfig.platformFeePercent;

    // Determinar nuevo porcentaje
    let newPercent = previousPercent;
    let changeType = 'MANUAL_OVERRIDE';

    if (dto.customFeePercent !== undefined) {
      newPercent = dto.customFeePercent;
    } else if (dto.useCustomFee === false) {
      newPercent = PLATFORM_FEE_STANDARD;
      changeType = 'RESET_TO_DEFAULT';
    }

    // Actualizar configuración
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      update: 'tipster_commission_configs',
      updates: [{
        q: { tipster_id: tipsterId },
        u: {
          $set: {
            ...(dto.customFeePercent !== undefined && { custom_fee_percent: dto.customFeePercent }),
            ...(dto.useCustomFee !== undefined && { use_custom_fee: dto.useCustomFee }),
            ...(dto.autoTierEnabled !== undefined && { auto_tier_enabled: dto.autoTierEnabled }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            last_modified_by: adminId,
            updated_at: { $date: now },
          },
        },
        upsert: true,
      }],
    });

    // Registrar en histórico
    const monthlyVolume = await this.getMonthlyVolume(tipsterId);
    await this.prisma.$runCommandRaw({
      insert: 'commission_change_history',
      documents: [{
        tipster_id: tipsterId,
        change_type: changeType,
        previous_percent: previousPercent || PLATFORM_FEE_STANDARD,
        new_percent: newPercent,
        reason: dto.notes || null,
        changed_by: adminId,
        changed_by_email: adminEmail,
        monthly_volume: monthlyVolume,
        created_at: { $date: now },
      }],
    });

    this.logger.log(`Commission updated for tipster ${tipsterId}: ${previousPercent}% -> ${newPercent}%`);

    return this.getTipsterCommissionConfig(tipsterId);
  }

  /**
   * Obtener histórico de cambios de comisión
   */
  async getCommissionHistory(tipsterId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'commission_change_history',
      filter: { tipster_id: tipsterId },
      sort: { created_at: -1 },
      limit: 50,
    }) as any;

    return result.cursor?.firstBatch || [];
  }

  /**
   * Obtener todos los tipsters con sus configuraciones de comisión (para Admin)
   */
  async getAllTipsterCommissions() {
    // Obtener todos los tipsters
    const tipstersResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      projection: { _id: 1, user_id: 1, public_name: 1 },
    }) as any;

    const tipsters = tipstersResult.cursor?.firstBatch || [];
    const result = [];

    for (const tipster of tipsters) {
      const tipsterId = tipster._id.$oid || tipster._id.toString();
      const config = await this.getTipsterCommissionConfig(tipsterId);
      const monthlyVolume = await this.getMonthlyVolume(tipsterId);

      // Determinar tier actual
      let currentTier = 'STANDARD';
      let effectivePercent = PLATFORM_FEE_STANDARD;

      if (config.useCustomFee && config.customFeePercent !== null) {
        currentTier = 'CUSTOM';
        effectivePercent = config.customFeePercent;
      } else if (config.autoTierEnabled && monthlyVolume >= HIGH_VOLUME_THRESHOLD_CENTS) {
        currentTier = 'HIGH_VOLUME';
        effectivePercent = PLATFORM_FEE_HIGH_VOLUME;
      }

      result.push({
        tipsterId,
        tipsterName: tipster.public_name,
        config,
        monthlyVolumeCents: monthlyVolume,
        monthlyVolumeEur: (monthlyVolume / 100).toFixed(2),
        currentTier,
        effectivePercent,
      });
    }

    return result;
  }

  /**
   * Calcular y guardar resumen mensual
   */
  async calculateMonthlySummary(tipsterId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Obtener todas las órdenes del mes
    const ordersResult = await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: {
        tipster_id: tipsterId,
        status: { $in: ['PAGADA', 'COMPLETED', 'paid', 'ACCESS_GRANTED'] },
        created_at: {
          $gte: { $date: startOfMonth.toISOString() },
          $lte: { $date: endOfMonth.toISOString() },
        },
      },
    }) as any;

    const orders = ordersResult.cursor?.firstBatch || [];

    // Calcular totales
    let grossAmountCents = 0;
    let gatewayFeesCents = 0;
    let platformFeesCents = 0;
    let netAmountCents = 0;

    for (const order of orders) {
      grossAmountCents += order.amount_cents || 0;
      gatewayFeesCents += order.gateway_fee_cents || 0;
      platformFeesCents += order.platform_fee_cents || 0;
      netAmountCents += order.net_amount_cents || 0;
    }

    // Determinar tier aplicado
    const appliedTier = grossAmountCents >= HIGH_VOLUME_THRESHOLD_CENTS ? 'HIGH_VOLUME' : 'STANDARD';

    // Guardar o actualizar resumen
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      update: 'tipster_monthly_summaries',
      updates: [{
        q: { tipster_id: tipsterId, year_month: yearMonth },
        u: {
          $set: {
            gross_amount_cents: grossAmountCents,
            gateway_fees_cents: gatewayFeesCents,
            platform_fees_cents: platformFeesCents,
            net_amount_cents: netAmountCents,
            order_count: orders.length,
            applied_tier: appliedTier,
            calculated_at: { $date: now },
            updated_at: { $date: now },
          },
          $setOnInsert: {
            tipster_id: tipsterId,
            year_month: yearMonth,
            created_at: { $date: now },
          },
        },
        upsert: true,
      }],
    });

    return {
      tipsterId,
      yearMonth,
      grossAmountCents,
      gatewayFeesCents,
      platformFeesCents,
      netAmountCents,
      orderCount: orders.length,
      appliedTier,
    };
  }

  /**
   * Obtener estadísticas de un tipster
   */
  async getTipsterStats(tipsterId: string) {
    const config = await this.getTipsterCommissionConfig(tipsterId);
    const monthlyVolume = await this.getMonthlyVolume(tipsterId);

    // Calcular tier actual
    let currentTier = 'STANDARD';
    let effectivePercent = PLATFORM_FEE_STANDARD;

    if (config.useCustomFee && config.customFeePercent !== null) {
      currentTier = 'CUSTOM';
      effectivePercent = config.customFeePercent;
    } else if (config.autoTierEnabled && monthlyVolume >= HIGH_VOLUME_THRESHOLD_CENTS) {
      currentTier = 'HIGH_VOLUME';
      effectivePercent = PLATFORM_FEE_HIGH_VOLUME;
    }

    // Obtener resumen del mes actual
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const summary = await this.calculateMonthlySummary(tipsterId, yearMonth);

    return {
      config,
      currentTier,
      effectivePercent,
      monthlyVolumeCents: monthlyVolume,
      monthlyVolumeEur: (monthlyVolume / 100).toFixed(2),
      highVolumeThresholdEur: (HIGH_VOLUME_THRESHOLD_CENTS / 100).toFixed(2),
      progressToHighVolume: Math.min(100, (monthlyVolume / HIGH_VOLUME_THRESHOLD_CENTS) * 100).toFixed(1),
      summary,
    };
  }
}
