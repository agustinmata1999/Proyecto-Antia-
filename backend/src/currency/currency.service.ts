import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest';
const CACHE_DURATION_MS = 3600000; // 1 hora

export interface ExchangeRateInfo {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: 'API' | 'MANUAL';
  isManualOverride: boolean;
  updatedAt: Date;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private rateCache: Map<string, { rate: number; fetchedAt: Date }> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener tipo de cambio entre dos monedas
   */
  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<ExchangeRateInfo> {
    if (baseCurrency === targetCurrency) {
      return {
        baseCurrency,
        targetCurrency,
        rate: 1,
        source: 'API',
        isManualOverride: false,
        updatedAt: new Date(),
      };
    }

    // Buscar override manual primero
    const manualRate = await this.getManualOverride(baseCurrency, targetCurrency);
    if (manualRate) {
      return manualRate;
    }

    // Buscar en caché
    const cacheKey = `${baseCurrency}_${targetCurrency}`;
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_DURATION_MS) {
      return {
        baseCurrency,
        targetCurrency,
        rate: cached.rate,
        source: 'API',
        isManualOverride: false,
        updatedAt: cached.fetchedAt,
      };
    }

    // Obtener de API externa
    try {
      const rate = await this.fetchFromAPI(baseCurrency, targetCurrency);
      
      // Guardar en caché
      this.rateCache.set(cacheKey, { rate, fetchedAt: new Date() });
      
      // Guardar en DB
      await this.saveRateToDb(baseCurrency, targetCurrency, rate, 'API');
      
      return {
        baseCurrency,
        targetCurrency,
        rate,
        source: 'API',
        isManualOverride: false,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error fetching exchange rate: ${error.message}`);
      
      // Intentar obtener último valor guardado
      const lastRate = await this.getLastSavedRate(baseCurrency, targetCurrency);
      if (lastRate) return lastRate;
      
      // Fallback a rate predeterminado
      const defaultRates = { EUR_USD: 1.08, USD_EUR: 0.93 };
      const fallbackRate = defaultRates[`${baseCurrency}_${targetCurrency}`] || 1;
      
      return {
        baseCurrency,
        targetCurrency,
        rate: fallbackRate,
        source: 'API',
        isManualOverride: false,
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Obtener tipo de cambio de API externa
   */
  private async fetchFromAPI(baseCurrency: string, targetCurrency: string): Promise<number> {
    const response = await axios.get(`${EXCHANGE_RATE_API_URL}/${baseCurrency}`);
    const rate = response.data.rates[targetCurrency];
    
    if (!rate) {
      throw new Error(`Rate not found for ${baseCurrency} to ${targetCurrency}`);
    }
    
    this.logger.log(`Fetched rate ${baseCurrency}/${targetCurrency}: ${rate}`);
    return rate;
  }

  /**
   * Obtener override manual de la DB
   */
  private async getManualOverride(baseCurrency: string, targetCurrency: string): Promise<ExchangeRateInfo | null> {
    const result = await this.prisma.$runCommandRaw({
      find: 'exchange_rates',
      filter: {
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        is_manual_override: true,
      },
      limit: 1,
    }) as any;

    const rate = result.cursor?.firstBatch?.[0];
    if (rate) {
      return {
        baseCurrency,
        targetCurrency,
        rate: rate.rate,
        source: 'MANUAL',
        isManualOverride: true,
        updatedAt: new Date(rate.updated_at?.$date || rate.updated_at),
      };
    }
    return null;
  }

  /**
   * Obtener último tipo de cambio guardado
   */
  private async getLastSavedRate(baseCurrency: string, targetCurrency: string): Promise<ExchangeRateInfo | null> {
    const result = await this.prisma.$runCommandRaw({
      find: 'exchange_rates',
      filter: {
        base_currency: baseCurrency,
        target_currency: targetCurrency,
      },
      sort: { updated_at: -1 },
      limit: 1,
    }) as any;

    const rate = result.cursor?.firstBatch?.[0];
    if (rate) {
      return {
        baseCurrency,
        targetCurrency,
        rate: rate.rate,
        source: rate.source,
        isManualOverride: rate.is_manual_override || false,
        updatedAt: new Date(rate.updated_at?.$date || rate.updated_at),
      };
    }
    return null;
  }

  /**
   * Guardar tipo de cambio en DB
   */
  private async saveRateToDb(baseCurrency: string, targetCurrency: string, rate: number, source: string) {
    const now = new Date().toISOString();
    
    await this.prisma.$runCommandRaw({
      update: 'exchange_rates',
      updates: [{
        q: { base_currency: baseCurrency, target_currency: targetCurrency },
        u: {
          $set: {
            rate,
            source,
            fetched_at: { $date: now },
            updated_at: { $date: now },
          },
          $setOnInsert: {
            base_currency: baseCurrency,
            target_currency: targetCurrency,
            is_manual_override: false,
            valid_from: { $date: now },
            created_at: { $date: now },
          },
        },
        upsert: true,
      }],
    });

    // Guardar en histórico
    await this.prisma.$runCommandRaw({
      insert: 'exchange_rate_history',
      documents: [{
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        rate,
        source,
        created_at: { $date: now },
      }],
    });
  }

  /**
   * Establecer tipo de cambio manual (Admin)
   */
  async setManualRate(baseCurrency: string, targetCurrency: string, rate: number, adminId: string) {
    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'exchange_rates',
      updates: [{
        q: { base_currency: baseCurrency, target_currency: targetCurrency },
        u: {
          $set: {
            rate,
            source: 'MANUAL',
            is_manual_override: true,
            updated_at: { $date: now },
          },
          $setOnInsert: {
            base_currency: baseCurrency,
            target_currency: targetCurrency,
            valid_from: { $date: now },
            fetched_at: { $date: now },
            created_at: { $date: now },
          },
        },
        upsert: true,
      }],
    });

    // Guardar en histórico
    await this.prisma.$runCommandRaw({
      insert: 'exchange_rate_history',
      documents: [{
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        rate,
        source: 'MANUAL',
        changed_by: adminId,
        created_at: { $date: now },
      }],
    });

    // Invalidar caché
    this.rateCache.delete(`${baseCurrency}_${targetCurrency}`);

    this.logger.log(`Manual rate set: ${baseCurrency}/${targetCurrency} = ${rate} by admin ${adminId}`);

    return { baseCurrency, targetCurrency, rate, source: 'MANUAL', isManualOverride: true };
  }

  /**
   * Eliminar override manual (volver a API)
   */
  async removeManualOverride(baseCurrency: string, targetCurrency: string) {
    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'exchange_rates',
      updates: [{
        q: { base_currency: baseCurrency, target_currency: targetCurrency },
        u: {
          $set: {
            is_manual_override: false,
            source: 'API',
            updated_at: { $date: now },
          },
        },
      }],
    });

    // Invalidar caché
    this.rateCache.delete(`${baseCurrency}_${targetCurrency}`);

    return { success: true, message: 'Manual override removed' };
  }

  /**
   * Obtener todos los tipos de cambio configurados
   */
  async getAllRates(): Promise<ExchangeRateInfo[]> {
    // Asegurar que tenemos EUR/USD y USD/EUR
    const pairs = [['EUR', 'USD'], ['USD', 'EUR']];
    const results: ExchangeRateInfo[] = [];

    for (const [base, target] of pairs) {
      const rate = await this.getExchangeRate(base, target);
      results.push(rate);
    }

    return results;
  }

  /**
   * Convertir cantidad entre monedas
   */
  async convertAmount(amountCents: number, fromCurrency: string, toCurrency: string): Promise<{
    originalAmountCents: number;
    convertedAmountCents: number;
    exchangeRate: number;
    fromCurrency: string;
    toCurrency: string;
  }> {
    const rateInfo = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmountCents = Math.round(amountCents * rateInfo.rate);

    return {
      originalAmountCents: amountCents,
      convertedAmountCents,
      exchangeRate: rateInfo.rate,
      fromCurrency,
      toCurrency,
    };
  }

  /**
   * Obtener histórico de tipos de cambio
   */
  async getRateHistory(baseCurrency: string, targetCurrency: string, limit: number = 30) {
    const result = await this.prisma.$runCommandRaw({
      find: 'exchange_rate_history',
      filter: {
        base_currency: baseCurrency,
        target_currency: targetCurrency,
      },
      sort: { created_at: -1 },
      limit,
    }) as any;

    return result.cursor?.firstBatch || [];
  }
}
