import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  createRedsysAPI,
  SANDBOX_URLS,
  PRODUCTION_URLS,
  CURRENCIES,
  TRANSACTION_TYPES,
  randomTransactionId,
} from 'redsys-easy';
import Decimal from 'decimal.js';

export interface RedsysPaymentResult {
  redirectUrl: string;
  formData: Record<string, string>;
  orderId: string;
  transactionId: string;
}

@Injectable()
export class RedsysService {
  private redsysApi: any;
  private readonly logger = new Logger(RedsysService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const environment = this.config.get('REDSYS_ENVIRONMENT') || 'sandbox';
    const urls = environment === 'production' ? PRODUCTION_URLS : SANDBOX_URLS;
    const secretKey = this.config.get('REDSYS_SECRET_KEY');

    if (secretKey) {
      this.redsysApi = createRedsysAPI({
        secretKey,
        urls,
      });
      this.logger.log(`Redsys initialized in ${environment} mode`);
    } else {
      this.logger.warn('REDSYS_SECRET_KEY not configured - Redsys payments disabled');
    }
  }

  /**
   * Check if Redsys is configured and available
   */
  isAvailable(): boolean {
    return !!this.redsysApi;
  }

  /**
   * Create Redsys payment session
   */
  async createPaymentSession(
    orderId: string,
    amountCents: number,
    currency: string,
    paymentMethod: 'CARD' | 'BIZUM',
    successUrl: string,
    cancelUrl: string,
    webhookUrl: string,
  ): Promise<RedsysPaymentResult> {
    if (!this.redsysApi) {
      throw new BadRequestException('Redsys no está configurado');
    }

    // Generate unique transaction ID (12 chars max for Redsys)
    const transactionId = randomTransactionId();

    // Build payment parameters
    const paymentParams: Record<string, any> = {
      DS_MERCHANT_MERCHANTCODE: this.config.get('REDSYS_MERCHANT_CODE'),
      DS_MERCHANT_TERMINAL: this.config.get('REDSYS_TERMINAL') || '001',
      DS_MERCHANT_TRANSACTIONTYPE: TRANSACTION_TYPES.AUTHORIZATION,
      DS_MERCHANT_AMOUNT: amountCents.toString(),
      DS_MERCHANT_CURRENCY: CURRENCIES.EUR,
      DS_MERCHANT_ORDER: transactionId,
      DS_MERCHANT_MERCHANTURL: webhookUrl,
      DS_MERCHANT_URLOK: successUrl,
      DS_MERCHANT_URLKO: cancelUrl,
      DS_MERCHANT_MERCHANTDATA: JSON.stringify({ orderId }),
    };

    // Add Bizum-specific parameter
    if (paymentMethod === 'BIZUM') {
      paymentParams.DS_MERCHANT_PAYMETHODS = 'z'; // 'z' = Bizum
    }

    try {
      // Generate redirect form
      const form = this.redsysApi.createRedirectForm(paymentParams);

      this.logger.log(`Created Redsys payment session: ${transactionId} for order ${orderId}`);

      return {
        redirectUrl: form.url,
        formData: form.body,
        orderId,
        transactionId,
      };
    } catch (error) {
      this.logger.error('Error creating Redsys payment session:', error);
      throw new BadRequestException('Error al crear sesión de pago con Redsys');
    }
  }

  /**
   * Process Redsys webhook notification
   */
  async processWebhook(body: any): Promise<{
    success: boolean;
    orderId?: string;
    transactionId?: string;
    responseCode?: string;
    authCode?: string;
  }> {
    if (!this.redsysApi) {
      throw new BadRequestException('Redsys no está configurado');
    }

    try {
      // Verify and decode the notification
      const result = this.redsysApi.processRestNotification(body);

      if (!result) {
        this.logger.error('Invalid Redsys webhook signature');
        return { success: false };
      }

      const { Ds_Order, Ds_Response, Ds_AuthorisationCode, Ds_MerchantData } = result;

      // Parse merchant data to get our orderId
      let orderId: string | undefined;
      try {
        const merchantData = JSON.parse(Ds_MerchantData || '{}');
        orderId = merchantData.orderId;
      } catch (e) {
        this.logger.warn('Could not parse merchant data');
      }

      // Check if payment was successful (response code 0000-0099)
      const responseCode = parseInt(Ds_Response, 10);
      const isSuccessful = responseCode >= 0 && responseCode < 100;

      this.logger.log(
        `Redsys webhook: order=${Ds_Order}, response=${Ds_Response}, success=${isSuccessful}`,
      );

      return {
        success: isSuccessful,
        orderId,
        transactionId: Ds_Order,
        responseCode: Ds_Response,
        authCode: Ds_AuthorisationCode,
      };
    } catch (error) {
      this.logger.error('Error processing Redsys webhook:', error);
      return { success: false };
    }
  }

  /**
   * Get commission rate for Redsys (example: 0.5%)
   */
  getCommissionRate(): number {
    return 0.5; // 0.5% - adjust based on your Redsys contract
  }
}
