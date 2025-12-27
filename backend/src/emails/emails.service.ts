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
  private readonly brandName: string = 'Antia';
  private readonly appUrl: string;
  private isConfigured: boolean = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private templates: EmailTemplatesService,
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.senderEmail = this.config.get<string>('SENDER_EMAIL') || 'onboarding@resend.dev';
    this.appUrl = this.config.get<string>('APP_URL') || 'https://antia.com';
    
    if (apiKey && apiKey !== 'your_resend_api_key_here') {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      this.logger.log(`✅ EmailService initialized with Resend (sender: ${this.senderEmail})`);
    } else {
      this.logger.warn('⚠️ RESEND_API_KEY not configured - emails will be logged only');
    }
  }

  /**
   * Send an email and log it to database
   */
  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; emailId?: string; error?: string }> {
    const { to, subject, html, type, metadata } = dto;
    
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
        this.logger.log(`📧 [DEV MODE] Email to ${to}:`);
        this.logger.log(`   Subject: ${subject}`);
        this.logger.log(`   Type: ${type}`);
        
        emailLog.status = 'LOGGED_DEV';
        await this.saveEmailLog(emailLog);
        
        return { success: true, emailId: emailLog.id };
      }

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

  // =============================================
  // CLIENTE - COMPRA / ACCESO
  // =============================================

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
    hasChannel?: boolean;
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

  async sendChannelAccessApproved(data: {
    email: string;
    productName: string;
    channelName: string;
  }) {
    const html = this.templates.channelAccessApproved(data);
    return this.sendEmail({
      to: data.email,
      subject: `Solicitud aprobada – ${data.channelName}`,
      html,
      type: 'CHANNEL_ACCESS_APPROVED',
      metadata: { productName: data.productName, channelName: data.channelName },
    });
  }

  async sendChannelAccessDenied(data: {
    email: string;
    productName: string;
    channelName: string;
    reason: string;
  }) {
    const html = this.templates.channelAccessDenied(data);
    return this.sendEmail({
      to: data.email,
      subject: `Acceso denegado – ${data.channelName}`,
      html,
      type: 'CHANNEL_ACCESS_DENIED',
      metadata: { productName: data.productName, reason: data.reason },
    });
  }

  async sendChannelLinkUpdated(data: {
    email: string;
    productName: string;
    channelName: string;
    newLink: string;
  }) {
    const html = this.templates.channelLinkUpdated(data);
    return this.sendEmail({
      to: data.email,
      subject: `Canal actualizado – ${data.productName}`,
      html,
      type: 'CHANNEL_LINK_UPDATED',
      metadata: { productName: data.productName },
    });
  }

  // =============================================
  // CLIENTE - CUENTA
  // =============================================

  async sendWelcomeClient(data: {
    email: string;
    name?: string;
  }) {
    const html = this.templates.welcomeClient(data);
    return this.sendEmail({
      to: data.email,
      subject: `¡Bienvenido a Antia!`,
      html,
      type: 'WELCOME_CLIENT',
      metadata: { email: data.email },
    });
  }

  async sendPasswordReset(data: {
    email: string;
    resetLink: string;
    expiresIn: string;
  }) {
    const html = this.templates.passwordReset(data);
    return this.sendEmail({
      to: data.email,
      subject: `Recuperar contraseña`,
      html,
      type: 'PASSWORD_RESET',
      metadata: {},
    });
  }

  async sendEmailVerification(data: {
    email: string;
    verificationLink: string;
    newEmail?: string;
  }) {
    const html = this.templates.emailVerification(data);
    return this.sendEmail({
      to: data.email,
      subject: `Verificar email`,
      html,
      type: 'EMAIL_VERIFICATION',
      metadata: {},
    });
  }

  // =============================================
  // CLIENTE - SOPORTE
  // =============================================

  async sendTicketCreated(data: {
    email: string;
    ticketId: string;
    subject: string;
  }) {
    const html = this.templates.ticketCreated(data);
    return this.sendEmail({
      to: data.email,
      subject: `Ticket #${data.ticketId} creado`,
      html,
      type: 'TICKET_CREATED',
      metadata: { ticketId: data.ticketId },
    });
  }

  async sendTicketReplied(data: {
    email: string;
    ticketId: string;
    subject: string;
    replyPreview: string;
  }) {
    const html = this.templates.ticketReplied(data);
    return this.sendEmail({
      to: data.email,
      subject: `Nueva respuesta – Ticket #${data.ticketId}`,
      html,
      type: 'TICKET_REPLIED',
      metadata: { ticketId: data.ticketId },
    });
  }

  async sendTicketClosed(data: {
    email: string;
    ticketId: string;
    subject: string;
  }) {
    const html = this.templates.ticketClosed(data);
    return this.sendEmail({
      to: data.email,
      subject: `Ticket #${data.ticketId} cerrado`,
      html,
      type: 'TICKET_CLOSED',
      metadata: { ticketId: data.ticketId },
    });
  }

  // =============================================
  // CLIENTE - SUSCRIPCIONES
  // =============================================

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

  // =============================================
  // TIPSTER - VENTAS / ACCESOS
  // =============================================

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

  async sendClientAccessedChannel(data: {
    tipsterEmail: string;
    productName: string;
    channelName: string;
    accessDate: Date;
  }) {
    const html = this.templates.clientAccessedChannel(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Cliente accedió al canal – ${data.channelName}`,
      html,
      type: 'CLIENT_ACCESSED_CHANNEL',
      metadata: { productName: data.productName },
    });
  }

  async sendAccessAttemptRejected(data: {
    tipsterEmail: string;
    productName: string;
    channelName: string;
    reason: string;
    attemptDate: Date;
  }) {
    const html = this.templates.accessAttemptRejected(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Intento de acceso rechazado – ${data.channelName}`,
      html,
      type: 'ACCESS_ATTEMPT_REJECTED',
      metadata: { productName: data.productName, reason: data.reason },
    });
  }

  // =============================================
  // TIPSTER - SUSCRIPCIONES
  // =============================================

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

  // =============================================
  // TIPSTER - OPERACIÓN / LIQUIDACIONES
  // =============================================

  async sendSettlementGenerated(data: {
    tipsterEmail: string;
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    currency: string;
    salesCount: number;
  }) {
    const html = this.templates.settlementGenerated(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Liquidación generada`,
      html,
      type: 'SETTLEMENT_GENERATED',
      metadata: { amount: data.totalAmount },
    });
  }

  async sendSettlementPaid(data: {
    tipsterEmail: string;
    amount: number;
    currency: string;
    paymentDate: Date;
    paymentMethod: string;
  }) {
    const html = this.templates.settlementPaid(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Pago procesado`,
      html,
      type: 'SETTLEMENT_PAID',
      metadata: { amount: data.amount },
    });
  }

  async sendKycReminder(data: {
    tipsterEmail: string;
    tipsterName: string;
    daysRemaining?: number;
  }) {
    const html = this.templates.kycReminder(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Completa tus datos de cobro`,
      html,
      type: 'KYC_REMINDER',
      metadata: {},
    });
  }

  async sendConfigurationChanged(data: {
    tipsterEmail: string;
    changeDescription: string;
    effectiveDate: Date;
  }) {
    const html = this.templates.configurationChanged(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Cambio de configuración`,
      html,
      type: 'CONFIGURATION_CHANGED',
      metadata: { changeDescription: data.changeDescription },
    });
  }

  // =============================================
  // TIPSTER - AFILIACIÓN
  // =============================================

  async sendAffiliateMonthlySummary(data: {
    tipsterEmail: string;
    month: string;
    totalEarnings: number;
    currency: string;
    conversions: number;
    clicks: number;
  }) {
    const html = this.templates.affiliateMonthlySummary(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Resumen de afiliación – ${data.month}`,
      html,
      type: 'AFFILIATE_MONTHLY_SUMMARY',
      metadata: { month: data.month },
    });
  }

  async sendAffiliateCsvUploaded(data: {
    tipsterEmail: string;
    fileName: string;
    recordsCount: number;
    uploadDate: Date;
  }) {
    const html = this.templates.affiliateCsvUploaded(data);
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `CSV de afiliación cargado`,
      html,
      type: 'AFFILIATE_CSV_UPLOADED',
      metadata: { fileName: data.fileName },
    });
  }

  // =============================================
  // TIPSTER - SEGURIDAD
  // =============================================

  async sendNewLoginDetected(data: {
    email: string;
    deviceInfo: string;
    location: string;
    loginDate: Date;
    ipAddress: string;
  }) {
    const html = this.templates.newLoginDetected(data);
    return this.sendEmail({
      to: data.email,
      subject: `Nuevo inicio de sesión detectado`,
      html,
      type: 'NEW_LOGIN_DETECTED',
      metadata: { ipAddress: data.ipAddress },
    });
  }

  async sendPasswordChanged(data: {
    email: string;
    changeDate: Date;
  }) {
    const html = this.templates.passwordChanged(data);
    return this.sendEmail({
      to: data.email,
      subject: `Contraseña actualizada`,
      html,
      type: 'PASSWORD_CHANGED',
      metadata: {},
    });
  }

  // =============================================
  // TIPSTER - REGISTRO Y APROBACIÓN
  // =============================================

  /**
   * Enviar email al tipster cuando se recibe su solicitud
   */
  async sendTipsterApplicationReceived(data: {
    tipsterEmail: string;
    tipsterName: string;
    applicationDate: Date;
  }) {
    const html = this.templates.tipsterApplicationReceived({
      tipsterName: data.tipsterName,
      email: data.tipsterEmail,
      applicationDate: data.applicationDate,
    });
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `¡Hemos recibido tu solicitud! – ${this.brandName}`,
      html,
      type: 'TIPSTER_APPLICATION_RECEIVED',
      metadata: { tipsterEmail: data.tipsterEmail },
    });
  }

  /**
   * Enviar email al tipster cuando su solicitud es aprobada
   */
  async sendTipsterApplicationApproved(data: {
    tipsterEmail: string;
    tipsterName: string;
    approvedDate: Date;
  }) {
    const loginUrl = `${this.appUrl}/login`;
    const html = this.templates.tipsterApplicationApproved({
      tipsterName: data.tipsterName,
      email: data.tipsterEmail,
      approvedDate: data.approvedDate,
      loginUrl,
    });
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `🎉 ¡Tu solicitud ha sido aprobada! – ${this.brandName}`,
      html,
      type: 'TIPSTER_APPLICATION_APPROVED',
      metadata: { tipsterEmail: data.tipsterEmail },
    });
  }

  /**
   * Enviar email al tipster cuando su solicitud es rechazada
   */
  async sendTipsterApplicationRejected(data: {
    tipsterEmail: string;
    tipsterName: string;
    rejectedDate: Date;
    rejectionReason?: string;
  }) {
    const html = this.templates.tipsterApplicationRejected({
      tipsterName: data.tipsterName,
      email: data.tipsterEmail,
      rejectedDate: data.rejectedDate,
      rejectionReason: data.rejectionReason,
    });
    return this.sendEmail({
      to: data.tipsterEmail,
      subject: `Actualización sobre tu solicitud – ${this.brandName}`,
      html,
      type: 'TIPSTER_APPLICATION_REJECTED',
      metadata: { tipsterEmail: data.tipsterEmail },
    });
  }

  // =============================================
  // SUPERADMIN
  // =============================================

  async sendNewTipsterApplication(data: {
    adminEmail: string;
    tipsterName: string;
    email: string;
    applicationDate: Date;
  }) {
    const html = this.templates.newTipsterApplication(data);
    return this.sendEmail({
      to: data.adminEmail,
      subject: `Nueva solicitud de tipster – ${data.tipsterName}`,
      html,
      type: 'NEW_TIPSTER_APPLICATION',
      metadata: { tipsterEmail: data.email },
    });
  }

  async sendTipsterKycCompleted(data: {
    adminEmail: string;
    tipsterName: string;
    email: string;
    completedDate: Date;
  }) {
    const html = this.templates.tipsterKycCompleted(data);
    return this.sendEmail({
      to: data.adminEmail,
      subject: `KYC completado – ${data.tipsterName}`,
      html,
      type: 'TIPSTER_KYC_COMPLETED',
      metadata: { tipsterEmail: data.email },
    });
  }

  async sendOperationalAlert(data: {
    adminEmail: string;
    alertType: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }) {
    const html = this.templates.operationalAlert(data);
    return this.sendEmail({
      to: data.adminEmail,
      subject: `[${data.severity.toUpperCase()}] Alerta: ${data.alertType}`,
      html,
      type: 'OPERATIONAL_ALERT',
      metadata: { alertType: data.alertType, severity: data.severity },
    });
  }

  async sendDailyActivitySummary(data: {
    adminEmail: string;
    date: Date;
    newUsers: number;
    totalSales: number;
    totalRevenue: number;
    currency: string;
    newTipsters: number;
    activeProducts: number;
  }) {
    const html = this.templates.dailyActivitySummary(data);
    return this.sendEmail({
      to: data.adminEmail,
      subject: `Resumen diario de actividad`,
      html,
      type: 'DAILY_ACTIVITY_SUMMARY',
      metadata: { date: data.date.toISOString() },
    });
  }

  // =============================================
  // HELPERS
  // =============================================

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

  isReady(): boolean {
    return this.isConfigured;
  }
}
