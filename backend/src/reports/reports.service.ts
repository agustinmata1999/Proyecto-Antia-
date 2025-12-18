import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../currency/currency.service';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  tipsterId?: string;
  currency?: string;
  status?: string;
}

export interface SalesReport {
  totalSales: number;
  totalGrossCents: number;
  totalNetCents: number;
  totalGatewayFeesCents: number;
  totalPlatformFeesCents: number;
  byPeriod: Array<{
    period: string;
    sales: number;
    grossCents: number;
    netCents: number;
  }>;
  byTipster: Array<{
    tipsterId: string;
    tipsterName: string;
    sales: number;
    grossCents: number;
    netCents: number;
  }>;
  byProduct: Array<{
    productId: string;
    productTitle: string;
    sales: number;
    grossCents: number;
  }>;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
  ) {}

  /**
   * Reporte de Ventas
   */
  async getSalesReport(filters: ReportFilters): Promise<SalesReport> {
    const { startDate, endDate, tipsterId } = filters;
    
    // Construir filtro de fechas
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = { $date: new Date(startDate).toISOString() };
    if (endDate) dateFilter.$lte = { $date: new Date(endDate).toISOString() };

    const matchStage: any = {
      status: { $in: ['PAGADA', 'COMPLETED', 'paid', 'ACCESS_GRANTED'] },
    };
    if (Object.keys(dateFilter).length > 0) matchStage.created_at = dateFilter;
    if (tipsterId) matchStage.tipster_id = tipsterId;

    // Totales generales
    const totalsResult = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalGrossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
            totalNetCents: { $sum: { $ifNull: ['$net_amount_cents', 0] } },
            totalGatewayFeesCents: { $sum: { $ifNull: ['$gateway_fee_cents', 0] } },
            totalPlatformFeesCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
          },
        },
      ],
      cursor: {},
    }) as any;

    const totals = totalsResult.cursor?.firstBatch?.[0] || {
      totalSales: 0,
      totalGrossCents: 0,
      totalNetCents: 0,
      totalGatewayFeesCents: 0,
      totalPlatformFeesCents: 0,
    };

    // Por período (día)
    const byPeriodResult = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
            sales: { $sum: 1 },
            grossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
            netCents: { $sum: { $ifNull: ['$net_amount_cents', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ],
      cursor: {},
    }) as any;

    const byPeriod = (byPeriodResult.cursor?.firstBatch || []).map((item: any) => ({
      period: item._id,
      sales: item.sales,
      grossCents: item.grossCents,
      netCents: item.netCents,
    }));

    // Por tipster
    const byTipsterResult = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: '$tipster_id',
            sales: { $sum: 1 },
            grossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
            netCents: { $sum: { $ifNull: ['$net_amount_cents', 0] } },
          },
        },
        { $sort: { grossCents: -1 } },
      ],
      cursor: {},
    }) as any;

    // Obtener nombres de tipsters
    const tipsterIds = (byTipsterResult.cursor?.firstBatch || []).map((t: any) => t._id).filter(Boolean);
    const tipstersMap = await this.getTipstersMap(tipsterIds);

    const byTipster = (byTipsterResult.cursor?.firstBatch || []).map((item: any) => ({
      tipsterId: item._id,
      tipsterName: tipstersMap[item._id] || 'Desconocido',
      sales: item.sales,
      grossCents: item.grossCents,
      netCents: item.netCents,
    }));

    // Por producto
    const byProductResult = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: '$product_id',
            sales: { $sum: 1 },
            grossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
          },
        },
        { $sort: { sales: -1 } },
        { $limit: 20 },
      ],
      cursor: {},
    }) as any;

    const productIds = (byProductResult.cursor?.firstBatch || []).map((p: any) => p._id).filter(Boolean);
    const productsMap = await this.getProductsMap(productIds);

    const byProduct = (byProductResult.cursor?.firstBatch || []).map((item: any) => ({
      productId: item._id,
      productTitle: productsMap[item._id] || 'Producto eliminado',
      sales: item.sales,
      grossCents: item.grossCents,
    }));

    return {
      totalSales: totals.totalSales,
      totalGrossCents: totals.totalGrossCents,
      totalNetCents: totals.totalNetCents,
      totalGatewayFeesCents: totals.totalGatewayFeesCents,
      totalPlatformFeesCents: totals.totalPlatformFeesCents,
      byPeriod,
      byTipster,
      byProduct,
    };
  }

  /**
   * Reporte de Ingresos de Plataforma
   */
  async getPlatformIncomeReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = { $date: new Date(startDate).toISOString() };
    if (endDate) dateFilter.$lte = { $date: new Date(endDate).toISOString() };

    const matchStage: any = {
      status: { $in: ['PAGADA', 'COMPLETED', 'paid', 'ACCESS_GRANTED'] },
    };
    if (Object.keys(dateFilter).length > 0) matchStage.created_at = dateFilter;

    // Totales de comisiones
    const result = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalGrossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
            totalPlatformFeesCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
            totalGatewayFeesCents: { $sum: { $ifNull: ['$gateway_fee_cents', 0] } },
          },
        },
      ],
      cursor: {},
    }) as any;

    const totals = result.cursor?.firstBatch?.[0] || {
      totalOrders: 0,
      totalGrossCents: 0,
      totalPlatformFeesCents: 0,
      totalGatewayFeesCents: 0,
    };

    // Por mes
    const byMonthResult = await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$created_at' } },
            orders: { $sum: 1 },
            grossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
            platformFeesCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
            gatewayFeesCents: { $sum: { $ifNull: ['$gateway_fee_cents', 0] } },
          },
        },
        { $sort: { _id: -1 } },
      ],
      cursor: {},
    }) as any;

    const byMonth = (byMonthResult.cursor?.firstBatch || []).map((item: any) => ({
      month: item._id,
      orders: item.orders,
      grossCents: item.grossCents,
      platformFeesCents: item.platformFeesCents,
      gatewayFeesCents: item.gatewayFeesCents,
      netPlatformIncome: item.platformFeesCents,
    }));

    return {
      totalOrders: totals.totalOrders,
      totalGrossCents: totals.totalGrossCents,
      totalPlatformFeesCents: totals.totalPlatformFeesCents,
      totalGatewayFeesCents: totals.totalGatewayFeesCents,
      avgPlatformFeePercent: totals.totalGrossCents > 0 
        ? ((totals.totalPlatformFeesCents / totals.totalGrossCents) * 100).toFixed(2)
        : 0,
      byMonth,
    };
  }

  /**
   * Reporte de Liquidaciones
   */
  async getSettlementsReport(filters: ReportFilters) {
    const { startDate, endDate, tipsterId, status } = filters;
    
    const matchStage: any = {};
    if (tipsterId) matchStage.tipster_id = tipsterId;
    if (status) matchStage.status = status;
    
    if (startDate || endDate) {
      matchStage.created_at = {};
      if (startDate) matchStage.created_at.$gte = { $date: new Date(startDate).toISOString() };
      if (endDate) matchStage.created_at.$lte = { $date: new Date(endDate).toISOString() };
    }

    // Por estado
    const byStatusResult = await this.prisma.$runCommandRaw({
      aggregate: 'settlements',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalGrossCents: { $sum: '$gross_amount_cents' },
            totalNetCents: { $sum: '$net_amount_cents' },
          },
        },
      ],
      cursor: {},
    }) as any;

    const byStatus = (byStatusResult.cursor?.firstBatch || []).map((item: any) => ({
      status: item._id,
      count: item.count,
      totalGrossCents: item.totalGrossCents,
      totalNetCents: item.totalNetCents,
    }));

    // Por tipo
    const byTypeResult = await this.prisma.$runCommandRaw({
      aggregate: 'settlements',
      pipeline: [
        { $match: matchStage },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalGrossCents: { $sum: '$gross_amount_cents' },
            totalNetCents: { $sum: '$net_amount_cents' },
          },
        },
      ],
      cursor: {},
    }) as any;

    const byType = (byTypeResult.cursor?.firstBatch || []).map((item: any) => ({
      type: item._id,
      count: item.count,
      totalGrossCents: item.totalGrossCents,
      totalNetCents: item.totalNetCents,
    }));

    // Totales
    const pending = byStatus.find((s: any) => s.status === 'PENDING') || { count: 0, totalNetCents: 0 };
    const paid = byStatus.find((s: any) => s.status === 'PAID') || { count: 0, totalNetCents: 0 };

    return {
      totalPendingCount: pending.count,
      totalPendingCents: pending.totalNetCents,
      totalPaidCount: paid.count,
      totalPaidCents: paid.totalNetCents,
      byStatus,
      byType,
    };
  }

  /**
   * Reporte de Tipsters
   */
  async getTipstersReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = { $date: new Date(startDate).toISOString() };
    if (endDate) dateFilter.$lte = { $date: new Date(endDate).toISOString() };

    // Obtener todos los tipsters
    const tipstersResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      projection: { _id: 1, user_id: 1, public_name: 1, module_forecasts: 1, module_affiliate: 1 },
    }) as any;

    const tipsters = tipstersResult.cursor?.firstBatch || [];
    const rankings = [];

    for (const tipster of tipsters) {
      const tipsterId = tipster._id.$oid || tipster._id.toString();

      // Obtener ventas del tipster
      const matchStage: any = {
        tipster_id: tipsterId,
        status: { $in: ['PAGADA', 'COMPLETED', 'paid', 'ACCESS_GRANTED'] },
      };
      if (Object.keys(dateFilter).length > 0) matchStage.created_at = dateFilter;

      const salesResult = await this.prisma.$runCommandRaw({
        aggregate: 'orders',
        pipeline: [
          { $match: matchStage },
          {
            $group: {
              _id: null,
              sales: { $sum: 1 },
              grossCents: { $sum: { $ifNull: ['$amount_cents', 0] } },
              netCents: { $sum: { $ifNull: ['$net_amount_cents', 0] } },
              platformFeesCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
            },
          },
        ],
        cursor: {},
      }) as any;

      const sales = salesResult.cursor?.firstBatch?.[0] || {
        sales: 0,
        grossCents: 0,
        netCents: 0,
        platformFeesCents: 0,
      };

      // Contar productos activos
      const productsResult = await this.prisma.$runCommandRaw({
        count: 'products',
        query: { tipster_id: tipsterId, active: true },
      }) as any;

      rankings.push({
        tipsterId,
        tipsterName: tipster.public_name,
        modules: {
          forecasts: tipster.module_forecasts !== false,
          affiliate: tipster.module_affiliate === true,
        },
        totalSales: sales.sales,
        totalGrossCents: sales.grossCents,
        totalNetCents: sales.netCents,
        platformFeesCents: sales.platformFeesCents,
        activeProducts: productsResult.n || 0,
      });
    }

    // Ordenar por ventas brutas
    rankings.sort((a, b) => b.totalGrossCents - a.totalGrossCents);

    // Calcular totales
    const totalGross = rankings.reduce((sum, t) => sum + t.totalGrossCents, 0);
    const totalSales = rankings.reduce((sum, t) => sum + t.totalSales, 0);

    return {
      totalTipsters: rankings.length,
      activeTipsters: rankings.filter(t => t.totalSales > 0).length,
      totalSales,
      totalGrossCents: totalGross,
      rankings,
    };
  }

  /**
   * Exportar a CSV
   */
  async exportToCSV(reportType: string, filters: ReportFilters): Promise<string> {
    let data: any;
    let headers: string[];
    let rows: string[][];

    switch (reportType) {
      case 'sales':
        data = await this.getSalesReport(filters);
        headers = ['Tipster', 'Ventas', 'Bruto (EUR)', 'Neto (EUR)'];
        rows = data.byTipster.map((t: any) => [
          t.tipsterName,
          t.sales.toString(),
          (t.grossCents / 100).toFixed(2),
          (t.netCents / 100).toFixed(2),
        ]);
        break;

      case 'platform':
        data = await this.getPlatformIncomeReport(filters);
        headers = ['Mes', 'Pedidos', 'Bruto (EUR)', 'Comisión Plataforma (EUR)', 'Comisión Pasarela (EUR)'];
        rows = data.byMonth.map((m: any) => [
          m.month,
          m.orders.toString(),
          (m.grossCents / 100).toFixed(2),
          (m.platformFeesCents / 100).toFixed(2),
          (m.gatewayFeesCents / 100).toFixed(2),
        ]);
        break;

      case 'settlements':
        data = await this.getSettlementsReport(filters);
        headers = ['Estado', 'Cantidad', 'Bruto (EUR)', 'Neto (EUR)'];
        rows = data.byStatus.map((s: any) => [
          s.status,
          s.count.toString(),
          (s.totalGrossCents / 100).toFixed(2),
          (s.totalNetCents / 100).toFixed(2),
        ]);
        break;

      case 'tipsters':
        data = await this.getTipstersReport(filters);
        headers = ['Tipster', 'Ventas', 'Bruto (EUR)', 'Neto (EUR)', 'Comisión Antia (EUR)', 'Productos Activos'];
        rows = data.rankings.map((t: any) => [
          t.tipsterName,
          t.totalSales.toString(),
          (t.totalGrossCents / 100).toFixed(2),
          (t.totalNetCents / 100).toFixed(2),
          (t.platformFeesCents / 100).toFixed(2),
          t.activeProducts.toString(),
        ]);
        break;

      default:
        throw new Error('Tipo de reporte no válido');
    }

    // Generar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Helper: Obtener mapa de tipsters
   */
  private async getTipstersMap(tipsterIds: string[]): Promise<Record<string, string>> {
    if (tipsterIds.length === 0) return {};

    const result = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { _id: { $in: tipsterIds.map(id => ({ $oid: id })) } },
      projection: { _id: 1, public_name: 1 },
    }) as any;

    const map: Record<string, string> = {};
    for (const t of result.cursor?.firstBatch || []) {
      const id = t._id.$oid || t._id.toString();
      map[id] = t.public_name;
    }
    return map;
  }

  /**
   * Helper: Obtener mapa de productos
   */
  private async getProductsMap(productIds: string[]): Promise<Record<string, string>> {
    if (productIds.length === 0) return {};

    const result = await this.prisma.$runCommandRaw({
      find: 'products',
      filter: { _id: { $in: productIds.map(id => ({ $oid: id })) } },
      projection: { _id: 1, title: 1 },
    }) as any;

    const map: Record<string, string> = {};
    for (const p of result.cursor?.firstBatch || []) {
      const id = p._id.$oid || p._id.toString();
      map[id] = p.title;
    }
    return map;
  }

  /**
   * Convertir reporte a otra moneda
   */
  async convertReportCurrency(report: any, targetCurrency: string) {
    if (targetCurrency === 'EUR') return report;

    const rate = await this.currencyService.getExchangeRate('EUR', targetCurrency);
    
    // Función recursiva para convertir todos los campos *Cents
    const convertObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(convertObject);
      }
      if (typeof obj === 'object' && obj !== null) {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key.endsWith('Cents') && typeof value === 'number') {
            converted[key] = Math.round(value * rate.rate);
          } else {
            converted[key] = convertObject(value);
          }
        }
        return converted;
      }
      return obj;
    };

    return {
      ...convertObject(report),
      currency: targetCurrency,
      exchangeRate: rate.rate,
      originalCurrency: 'EUR',
    };
  }
}
