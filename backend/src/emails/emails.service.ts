import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplatesService } from './email-templates.service';

export interface SendEmailDto {
  to: string;
  subject: string;
  html: string;
  type: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);
  private readonly senderEmail: string;
  private readonly senderName: string = 'Antia';
  private readonly isConfigured: boolean = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private templates: EmailTemplatesService,
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.senderEmail = this.config.get<string>('SENDER_EMAIL') || 'onboarding@resend.dev';
    
    if (apiKey && apiKey !== 'your_resend_api_key_here') {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log('✅ EmailService initialized with Resend');
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not configured - emails will be logged only');
    }
  }

  /**
   * Send an email and log it to database
   */
  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; emailId?: string; error?: string }> {
    const { to, subject, html, type, metadata } = dto;
    
    // Log the email attempt
    const emailLog = {
      id: this.generateId(),
      to,
      subject,
      type,
      status: 'PENDING',
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    try {
      if (!this.resend) {
        // Development mode - just log
        this.logger.log(`📧 [DEV MODE] Email to ${to}:`);
        this.logger.log(`   Subject: ${subject}`);
        this.logger.log(`   Type: ${type}`);
        
        emailLog.status = 'LOGGED_DEV';
        await this.saveEmailLog(emailLog);
        
        return { success: true, emailId: emailLog.id };
      }

      // Send via Resend
      const result = await this.resend.emails.send({
        from: `${this.senderName} <${this.senderEmail}>`,
        to: [to],
        subject,
        html,
      });

      emailLog.status = 'SENT';
      emailLog['resend_id'] = result.data?.id;
      await this.saveEmailLog(emailLog);

      this.logger.log(`✅ Email sent to ${to} (${type})`);
      return { success: true, emailId: result.data?.id };

    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error.message);
      
      emailLog.status = 'FAILED';
      emailLog['error'] = error.message;
      await this.saveEmailLog(emailLog);

      return { success: false, error: error.message };
    }
  }

  /**
   * =============================================
   * CLIENT EMAILS
   * =============================================
   */

  /**
   * 1.1 Confirmación de compra (obligatorio)
   */
  async sendPurchaseConfirmation(data: {
    email: string;
    productName: string;
    tipsterName: string;
    billingType: 'ONE_TIME' | 'SUBSCRIPTION';
    billingPeriod?: string;
    amount: number;
    currency: string;
    orderId: string;
    purchaseDate: Date;
  }) {
    const html = this.templates.purchaseConfirmation(data);
    
    return this.sendEmail({
      to: data.email,
      subject: `Confirmación de compra – ${data.productName}`,
      html,
      type: 'PURCHASE_CONFIRMATION',
      metadata: { orderId: data.orderId, productName: data.productName },
    });
  }

  /**
   * 1.2 Acceso al canal (producto con canal)
   */
  async sendChannelAccess(data: {
    email: string;
    productName: string;
    channelName: string;
    telegramLink: string;
    orderId: string;
  }) {
    const html = this.templates.channelAccess(data);
    
    return this.sendEmail({
      to: data.email,
      subject: `Acceso a tu contenido – ${data.productName}`,
      html,
      type: 'CHANNEL_ACCESS',
      metadata: { orderId: data.orderId, channelName: data.channelName },
    });
  }

  /**
   * 1.3a Alta de suscripción
   */
  async sendSubscriptionActivated(data: {
    email: string;
    productName: string;
    tipsterName: string;
    billingPeriod: string;
    nextRenewalDate: Date;
    amount: number;
    currency: string;
  }) {
    const html = this.templates.subscriptionActivated(data);
    
    return this.sendEmail({
      to: data.email,
      subject: `Suscripción activada – ${data.productName}`,
      html,
      type: 'SUBSCRIPTION_ACTIVATED',
      metadata: { productName: data.productName },
    });
  }

  /**
   * 1.3b Cancelación voluntaria
   */
  async sendSubscriptionCancelled(data: {
    email: string;
    productName: string;
    accessUntil: Date;
  }) {
    const html = this.templates.subscriptionCancelled(data);
    
    return this.sendEmail({
      to: data.email,
      subject: `Suscripción cancelada – ${data.productName}`,
      html,
      type: 'SUBSCRIPTION_CANCELLED',
      metadata: { productName: data.productName },
    });
  }

  /**
   * 1.3c Expiración de suscripción
   */
  async sendSubscriptionExpired(data: {
    email: string;
    productName: string;
    channelName?: string;
  }) {
    const html = this.templates.subscriptionExpired(data);
    
    return this.sendEmail({
      to: data.email,
      subject: `Suscripción expirada – ${data.productName}`,
      html,
      type: 'SUBSCRIPTION_EXPIRED',
      metadata: { productName: data.productName },
    });
  }

  /**
   * =============================================
   * TIPSTER EMAILS
   * =============================================
   */

  /**
   * 2.1 Aviso de nueva venta
   */
  async sendNewSaleNotification(data: {
    tipsterEmail: string;
    productName: string;
    billingType: 'ONE_TIME' | 'SUBSCRIPTION';
    saleDate: Date;
    netAmount: number;
    currency: string;
    orderId: string;
    panelUrl: string;
  }) {
    const html = this.templates.newSaleNotification(data);
    
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Nueva venta realizada – ${data.productName}`,
      html,
      type: 'NEW_SALE_TIPSTER',
      metadata: { orderId: data.orderId, productName: data.productName },
    });
  }

  /**
   * 2.2a Notificar nueva suscripción al tipster
   */
  async sendTipsterSubscriptionStarted(data: {
    tipsterEmail: string;
    productName: string;
    clientEmail: string;
    billingPeriod: string;
  }) {
    const html = this.templates.tipsterSubscriptionStarted(data);
    
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Nueva suscripción – ${data.productName}`,
      html,
      type: 'SUBSCRIPTION_STARTED_TIPSTER',
      metadata: { productName: data.productName },
    });
  }

  /**
   * 2.2b Notificar cancelación al tipster
   */
  async sendTipsterSubscriptionCancelled(data: {
    tipsterEmail: string;
    productName: string;
    clientEmail: string;
  }) {
    const html = this.templates.tipsterSubscriptionCancelled(data);
    
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Suscripción cancelada – ${data.productName}`,
      html,
      type: 'SUBSCRIPTION_CANCELLED_TIPSTER',
      metadata: { productName: data.productName },
    });
  }

  /**
   * 2.2c Notificar expiración al tipster
   */
  async sendTipsterSubscriptionExpired(data: {
    tipsterEmail: string;
    productName: string;
    clientEmail: string;
  }) {
    const html = this.templates.tipsterSubscriptionExpired(data);
    
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Suscripción expirada – ${data.productName}`,
      html,
      type: 'SUBSCRIPTION_EXPIRED_TIPSTER',
      metadata: { productName: data.productName },
    });
  }

  /**
   * =============================================
   * HELPERS
   * =============================================
   */

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async saveEmailLog(log: any) {
    try {
      await this.prisma.$runCommandRaw({
        insert: 'email_logs',
        documents: [log],
      });
    } catch (error) {
      this.logger.error('Failed to save email log:', error.message);
    }
  }

  /**
   * Get email logs for admin
   */
  async getEmailLogs(filters: { type?: string; status?: string; limit?: number } = {}) {
    const { type, status, limit = 50 } = filters;
    
    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const result = await this.prisma.$runCommandRaw({
      find: 'email_logs',
      filter,
      sort: { created_at: -1 },
      limit,
      projection: { _id: 0 },
    }) as any;

    return result.cursor?.firstBatch || [];
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}
