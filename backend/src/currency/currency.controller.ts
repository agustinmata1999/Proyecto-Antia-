import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrencyService } from './currency.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('currency')
export class CurrencyController {
  constructor(
    private currencyService: CurrencyService,
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
   * GET /api/currency/rates - Obtener todos los tipos de cambio (público)
   */
  @Get('rates')
  async getAllRates() {
    const rates = await this.currencyService.getAllRates();
    return { rates };
  }

  /**
   * GET /api/currency/rate/:base/:target - Obtener tipo de cambio específico (público)
   */
  @Get('rate/:base/:target')
  async getRate(@Param('base') base: string, @Param('target') target: string) {
    const rate = await this.currencyService.getExchangeRate(
      base.toUpperCase(),
      target.toUpperCase(),
    );
    return rate;
  }

  /**
   * GET /api/currency/convert - Convertir cantidad (público)
   */
  @Get('convert')
  async convertAmount(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const amountCents = parseInt(amount, 10);
    if (isNaN(amountCents)) {
      return { error: 'Invalid amount' };
    }

    const result = await this.currencyService.convertAmount(
      amountCents,
      from.toUpperCase(),
      to.toUpperCase(),
    );
    return result;
  }

  /**
   * POST /api/currency/admin/rate - Establecer tipo de cambio manual (Admin)
   */
  @Post('admin/rate')
  @UseGuards(JwtAuthGuard)
  async setManualRate(
    @Body() body: { baseCurrency: string; targetCurrency: string; rate: number },
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const result = await this.currencyService.setManualRate(
      body.baseCurrency.toUpperCase(),
      body.targetCurrency.toUpperCase(),
      body.rate,
      req.user.id,
    );

    return {
      success: true,
      message: 'Tipo de cambio manual establecido',
      rate: result,
    };
  }

  /**
   * DELETE /api/currency/admin/rate/:base/:target - Eliminar override manual (Admin)
   */
  @Delete('admin/rate/:base/:target')
  @UseGuards(JwtAuthGuard)
  async removeManualOverride(
    @Param('base') base: string,
    @Param('target') target: string,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const result = await this.currencyService.removeManualOverride(
      base.toUpperCase(),
      target.toUpperCase(),
    );

    return result;
  }

  /**
   * GET /api/currency/admin/history/:base/:target - Obtener histórico (Admin)
   */
  @Get('admin/history/:base/:target')
  @UseGuards(JwtAuthGuard)
  async getRateHistory(
    @Param('base') base: string,
    @Param('target') target: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    await this.verifyAdmin(req.user.id);

    const history = await this.currencyService.getRateHistory(
      base.toUpperCase(),
      target.toUpperCase(),
      parseInt(limit, 10) || 30,
    );

    return { history };
  }
}
