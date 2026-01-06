import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReportsService, ReportFilters } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Verificar que el usuario es SuperAdmin
   */
  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo SuperAdmin puede acceder a esta función');
    }

    return user;
  }

  /**
   * GET /api/admin/reports/sales - Reporte de ventas
   */
  @Get('sales')
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tipsterId') tipsterId: string,
    @Query('currency') currency: string,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const filters: ReportFilters = { startDate, endDate, tipsterId };
    let report = await this.reportsService.getSalesReport(filters);

    if (currency && currency !== 'EUR') {
      report = await this.reportsService.convertReportCurrency(report, currency);
    }

    return report;
  }

  /**
   * GET /api/admin/reports/platform - Reporte de ingresos de plataforma
   */
  @Get('platform')
  async getPlatformIncomeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('currency') currency: string,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const filters: ReportFilters = { startDate, endDate };
    let report = await this.reportsService.getPlatformIncomeReport(filters);

    if (currency && currency !== 'EUR') {
      report = await this.reportsService.convertReportCurrency(report, currency);
    }

    return report;
  }

  /**
   * GET /api/admin/reports/settlements - Reporte de liquidaciones
   */
  @Get('settlements')
  async getSettlementsReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tipsterId') tipsterId: string,
    @Query('status') status: string,
    @Query('currency') currency: string,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const filters: ReportFilters = { startDate, endDate, tipsterId, status };
    let report = await this.reportsService.getSettlementsReport(filters);

    if (currency && currency !== 'EUR') {
      report = await this.reportsService.convertReportCurrency(report, currency);
    }

    return report;
  }

  /**
   * GET /api/admin/reports/tipsters - Reporte de tipsters
   */
  @Get('tipsters')
  async getTipstersReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('currency') currency: string,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const filters: ReportFilters = { startDate, endDate };
    let report = await this.reportsService.getTipstersReport(filters);

    if (currency && currency !== 'EUR') {
      report = await this.reportsService.convertReportCurrency(report, currency);
    }

    return report;
  }

  /**
   * GET /api/admin/reports/export/:type - Exportar reporte a CSV
   */
  @Get('export/:type')
  async exportReport(
    @Query('type') type: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tipsterId') tipsterId: string,
    @Query('status') status: string,
    @Res() res: Response,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const reportType = req.params.type;
    const filters: ReportFilters = { startDate, endDate, tipsterId, status };

    const csv = await this.reportsService.exportToCSV(reportType, filters);

    const filename = `antia_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  /**
   * GET /api/admin/reports/summary - Resumen general
   */
  @Get('summary')
  async getSummary(@Query('currency') currency: string, @Request() req) {
    await this.verifyAdmin(req.user.id);

    // Últimos 30 días
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const filters: ReportFilters = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    const [sales, platform, settlements, tipsters] = await Promise.all([
      this.reportsService.getSalesReport(filters),
      this.reportsService.getPlatformIncomeReport(filters),
      this.reportsService.getSettlementsReport({}),
      this.reportsService.getTipstersReport(filters),
    ]);

    let summary = {
      last30Days: {
        totalSales: sales.totalSales,
        totalGrossCents: sales.totalGrossCents,
        totalNetCents: sales.totalNetCents,
        platformIncomeCents: platform.totalPlatformFeesCents,
      },
      settlements: {
        pendingCount: settlements.totalPendingCount,
        pendingCents: settlements.totalPendingCents,
        paidCount: settlements.totalPaidCount,
        paidCents: settlements.totalPaidCents,
      },
      tipsters: {
        total: tipsters.totalTipsters,
        active: tipsters.activeTipsters,
      },
      currency: 'EUR',
    };

    if (currency && currency !== 'EUR') {
      summary = await this.reportsService.convertReportCurrency(summary, currency);
    }

    return summary;
  }
}
