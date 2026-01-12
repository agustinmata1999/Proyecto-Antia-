import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener el ID del perfil de tipster a partir del userId
   */
  private async getTipsterProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id || null;
  }

  /**
   * Obtener saldo disponible para retiro de un tipster
   */
  async getAvailableBalance(userId: string) {
    // Primero obtener el profileId del tipster
    const profileId = await this.getTipsterProfileId(userId);
    if (!profileId) {
      return {
        totalEarnedCents: 0,
        totalGrossCents: 0,
        totalPlatformFeeCents: 0,
        totalGatewayFeeCents: 0,
        totalWithdrawnCents: 0,
        pendingWithdrawalCents: 0,
        availableBalanceCents: 0,
        orderCount: 0,
        withdrawalCount: 0,
        pendingCount: 0,
        currency: 'EUR',
      };
    }

    // Calcular ingresos netos totales de órdenes pagadas
    const ordersResult = (await this.prisma.$runCommandRaw({
      aggregate: 'orders',
      pipeline: [
        {
          $match: {
            tipster_id: profileId,
            status: { $in: ['PAGADA', 'ACCESS_GRANTED', 'COMPLETED', 'paid'] },
          },
        },
        {
          $group: {
            _id: null,
            totalNetCents: { $sum: { $ifNull: ['$net_amount_cents', '$amount_cents'] } },
            totalGrossCents: { $sum: '$amount_cents' },
            totalPlatformFeeCents: { $sum: { $ifNull: ['$platform_fee_cents', 0] } },
            totalGatewayFeeCents: { $sum: { $ifNull: ['$gateway_fee_cents', 0] } },
            orderCount: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    })) as any;

    const orderStats = ordersResult.cursor?.firstBatch?.[0] || {
      totalNetCents: 0,
      totalGrossCents: 0,
      totalPlatformFeeCents: 0,
      totalGatewayFeeCents: 0,
      orderCount: 0,
    };

    // Calcular retiros ya pagados (usando el userId, no profileId)
    const withdrawalsResult = (await this.prisma.$runCommandRaw({
      aggregate: 'withdrawal_requests',
      pipeline: [
        {
          $match: {
            tipster_id: userId,
            status: { $in: ['APPROVED', 'PAID'] },
          },
        },
        {
          $group: {
            _id: null,
            totalWithdrawnCents: { $sum: '$amount_cents' },
            withdrawalCount: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    })) as any;

    const withdrawalStats = withdrawalsResult.cursor?.firstBatch?.[0] || {
      totalWithdrawnCents: 0,
      withdrawalCount: 0,
    };

    // Calcular retiros pendientes
    const pendingResult = (await this.prisma.$runCommandRaw({
      aggregate: 'withdrawal_requests',
      pipeline: [
        {
          $match: {
            tipster_id: userId,
            status: 'PENDING',
          },
        },
        {
          $group: {
            _id: null,
            totalPendingCents: { $sum: '$amount_cents' },
            pendingCount: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    })) as any;

    const pendingStats = pendingResult.cursor?.firstBatch?.[0] || {
      totalPendingCents: 0,
      pendingCount: 0,
    };

    const availableBalanceCents = orderStats.totalNetCents - withdrawalStats.totalWithdrawnCents - pendingStats.totalPendingCents;

    return {
      totalEarnedCents: orderStats.totalNetCents,
      totalGrossCents: orderStats.totalGrossCents,
      totalPlatformFeeCents: orderStats.totalPlatformFeeCents,
      totalGatewayFeeCents: orderStats.totalGatewayFeeCents,
      totalWithdrawnCents: withdrawalStats.totalWithdrawnCents,
      pendingWithdrawalCents: pendingStats.totalPendingCents,
      availableBalanceCents: Math.max(0, availableBalanceCents),
      orderCount: orderStats.orderCount,
      withdrawalCount: withdrawalStats.withdrawalCount,
      pendingCount: pendingStats.pendingCount,
      currency: 'EUR',
    };
  }

  /**
   * Crear solicitud de retiro
   */
  async createWithdrawalRequest(tipsterId: string, data: {
    amountCents: number;
    notes?: string;
  }) {
    // Verificar saldo disponible
    const balance = await this.getAvailableBalance(tipsterId);
    
    if (data.amountCents > balance.availableBalanceCents) {
      throw new BadRequestException(
        `Saldo insuficiente. Disponible: €${(balance.availableBalanceCents / 100).toFixed(2)}, Solicitado: €${(data.amountCents / 100).toFixed(2)}`
      );
    }

    if (data.amountCents < 500) { // Mínimo €5
      throw new BadRequestException('El monto mínimo de retiro es €5.00');
    }

    // Obtener datos del tipster
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: tipsterId },
    });

    if (!tipsterProfile) {
      throw new NotFoundException('Perfil de tipster no encontrado');
    }

    // Verificar que tenga datos bancarios
    if (!tipsterProfile.bankAccountType || !tipsterProfile.bankAccountDetails) {
      throw new BadRequestException(
        'Debes completar tus datos bancarios antes de solicitar un retiro. Ve a "Datos de Cobro" en tu perfil.'
      );
    }

    // Obtener email del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: tipsterId },
    });

    // Generar número de factura único
    const invoiceNumber = await this.generateInvoiceNumber();

    const now = new Date().toISOString();

    // Crear la solicitud
    const insertResult = await this.prisma.$runCommandRaw({
      insert: 'withdrawal_requests',
      documents: [
        {
          tipster_id: tipsterId,
          amount_cents: data.amountCents,
          currency: 'EUR',
          status: 'PENDING',
          invoice_number: invoiceNumber,
          invoice_pdf_url: null,
          tipster_name: tipsterProfile.publicName,
          tipster_email: user?.email || null,
          tipster_legal_name: tipsterProfile.legalName || null,
          tipster_document_type: tipsterProfile.documentType || null,
          tipster_document_number: tipsterProfile.documentNumber || null,
          tipster_country: tipsterProfile.country || null,
          tipster_address: null,
          tipster_city: null,
          tipster_postal_code: null,
          bank_account_type: tipsterProfile.bankAccountType,
          bank_account_details: tipsterProfile.bankAccountDetails || null,
          tipster_notes: data.notes || null,
          admin_notes: null,
          rejection_reason: null,
          period_start: null,
          period_end: { $date: now },
          gross_amount_cents: balance.totalGrossCents,
          platform_fee_cents: balance.totalPlatformFeeCents,
          gateway_fee_cents: balance.totalGatewayFeeCents,
          payment_method: null,
          payment_reference: null,
          paid_by: null,
          requested_at: { $date: now },
          approved_at: null,
          approved_by: null,
          paid_at: null,
          rejected_at: null,
          rejected_by: null,
          created_at: { $date: now },
          updated_at: { $date: now },
        },
      ],
    });

    this.logger.log(`Withdrawal request created: ${invoiceNumber} for tipster ${tipsterId} - €${(data.amountCents / 100).toFixed(2)}`);

    // Generar PDF de factura
    const pdfUrl = await this.generateInvoicePdf(invoiceNumber, {
      tipsterName: tipsterProfile.publicName,
      tipsterEmail: user?.email,
      tipsterLegalName: tipsterProfile.legalName,
      tipsterDocumentType: tipsterProfile.documentType,
      tipsterDocumentNumber: tipsterProfile.documentNumber,
      tipsterCountry: tipsterProfile.country,
      bankAccountType: tipsterProfile.bankAccountType,
      bankAccountDetails: tipsterProfile.bankAccountDetails as any,
      amountCents: data.amountCents,
      currency: 'EUR',
      requestedAt: new Date(),
    });

    // Actualizar con URL del PDF
    if (pdfUrl) {
      await this.prisma.$runCommandRaw({
        update: 'withdrawal_requests',
        updates: [
          {
            q: { invoice_number: invoiceNumber },
            u: { $set: { invoice_pdf_url: pdfUrl, updated_at: { $date: new Date().toISOString() } } },
          },
        ],
      });
    }

    return {
      success: true,
      invoiceNumber,
      amountCents: data.amountCents,
      currency: 'EUR',
      invoicePdfUrl: pdfUrl,
      message: 'Solicitud de retiro creada exitosamente',
    };
  }

  /**
   * Obtener solicitudes de retiro del tipster
   */
  async getTipsterWithdrawals(tipsterId: string, limit = 50) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'withdrawal_requests',
      filter: { tipster_id: tipsterId },
      sort: { requested_at: -1 },
      limit,
    })) as any;

    return (result.cursor?.firstBatch || []).map(this.mapWithdrawalDocument);
  }

  /**
   * Admin: Obtener todas las solicitudes de retiro
   */
  async getAllWithdrawals(filters?: {
    status?: string;
    tipsterId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const match: any = {};

    if (filters?.status) {
      match.status = filters.status;
    }
    if (filters?.tipsterId) {
      match.tipster_id = filters.tipsterId;
    }
    if (filters?.startDate || filters?.endDate) {
      match.requested_at = {};
      if (filters.startDate) {
        match.requested_at.$gte = { $date: new Date(filters.startDate).toISOString() };
      }
      if (filters.endDate) {
        match.requested_at.$lte = { $date: new Date(filters.endDate).toISOString() };
      }
    }

    const result = (await this.prisma.$runCommandRaw({
      find: 'withdrawal_requests',
      filter: match,
      sort: { requested_at: -1 },
      limit: 200,
    })) as any;

    const withdrawals = (result.cursor?.firstBatch || []).map(this.mapWithdrawalDocument);

    // Calcular stats
    const statsResult = (await this.prisma.$runCommandRaw({
      aggregate: 'withdrawal_requests',
      pipeline: [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalCents: { $sum: '$amount_cents' },
          },
        },
      ],
      cursor: {},
    })) as any;

    const stats = {
      pending: { count: 0, totalCents: 0 },
      approved: { count: 0, totalCents: 0 },
      paid: { count: 0, totalCents: 0 },
      rejected: { count: 0, totalCents: 0 },
    };

    (statsResult.cursor?.firstBatch || []).forEach((s: any) => {
      const key = s._id?.toLowerCase();
      if (stats[key]) {
        stats[key] = { count: s.count, totalCents: s.totalCents };
      }
    });

    return { withdrawals, stats };
  }

  /**
   * Admin: Aprobar solicitud de retiro
   */
  async approveWithdrawal(withdrawalId: string, adminId: string, adminNotes?: string) {
    const withdrawal = await this.getWithdrawalById(withdrawalId);

    if (!withdrawal) {
      throw new NotFoundException('Solicitud de retiro no encontrada');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`La solicitud ya fue procesada (estado: ${withdrawal.status})`);
    }

    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'withdrawal_requests',
      updates: [
        {
          q: { _id: { $oid: withdrawalId } },
          u: {
            $set: {
              status: 'APPROVED',
              approved_at: { $date: now },
              approved_by: adminId,
              admin_notes: adminNotes || null,
              updated_at: { $date: now },
            },
          },
        },
      ],
    });

    this.logger.log(`Withdrawal ${withdrawalId} APPROVED by admin ${adminId}`);

    return { success: true, message: 'Solicitud aprobada' };
  }

  /**
   * Admin: Marcar como pagado
   */
  async markAsPaid(
    withdrawalId: string,
    adminId: string,
    data: { paymentMethod: string; paymentReference?: string; adminNotes?: string }
  ) {
    const withdrawal = await this.getWithdrawalById(withdrawalId);

    if (!withdrawal) {
      throw new NotFoundException('Solicitud de retiro no encontrada');
    }

    if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`La solicitud no puede ser marcada como pagada (estado: ${withdrawal.status})`);
    }

    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'withdrawal_requests',
      updates: [
        {
          q: { _id: { $oid: withdrawalId } },
          u: {
            $set: {
              status: 'PAID',
              payment_method: data.paymentMethod,
              payment_reference: data.paymentReference || null,
              paid_at: { $date: now },
              paid_by: adminId,
              admin_notes: data.adminNotes || withdrawal.adminNotes || null,
              approved_at: withdrawal.approvedAt ? withdrawal.approvedAt : { $date: now },
              approved_by: withdrawal.approvedBy || adminId,
              updated_at: { $date: now },
            },
          },
        },
      ],
    });

    this.logger.log(`Withdrawal ${withdrawalId} marked as PAID by admin ${adminId}`);

    return { success: true, message: 'Solicitud marcada como pagada' };
  }

  /**
   * Admin: Rechazar solicitud
   */
  async rejectWithdrawal(withdrawalId: string, adminId: string, rejectionReason: string) {
    const withdrawal = await this.getWithdrawalById(withdrawalId);

    if (!withdrawal) {
      throw new NotFoundException('Solicitud de retiro no encontrada');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`La solicitud ya fue procesada (estado: ${withdrawal.status})`);
    }

    if (!rejectionReason?.trim()) {
      throw new BadRequestException('Debes proporcionar un motivo de rechazo');
    }

    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'withdrawal_requests',
      updates: [
        {
          q: { _id: { $oid: withdrawalId } },
          u: {
            $set: {
              status: 'REJECTED',
              rejection_reason: rejectionReason,
              rejected_at: { $date: now },
              rejected_by: adminId,
              updated_at: { $date: now },
            },
          },
        },
      ],
    });

    this.logger.log(`Withdrawal ${withdrawalId} REJECTED by admin ${adminId}: ${rejectionReason}`);

    return { success: true, message: 'Solicitud rechazada' };
  }

  /**
   * Obtener una solicitud por ID
   */
  private async getWithdrawalById(id: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'withdrawal_requests',
      filter: { _id: { $oid: id } },
      limit: 1,
    })) as any;

    const doc = result.cursor?.firstBatch?.[0];
    return doc ? this.mapWithdrawalDocument(doc) : null;
  }

  /**
   * Generar número de factura único
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ANTIA-${year}`;

    // Contar facturas del año
    const result = (await this.prisma.$runCommandRaw({
      count: 'withdrawal_requests',
      query: { invoice_number: { $regex: `^${prefix}` } },
    })) as any;

    const count = (result.n || 0) + 1;
    const paddedNumber = count.toString().padStart(4, '0');

    return `${prefix}-${paddedNumber}`;
  }

  /**
   * Generar PDF de factura (versión simplificada - genera HTML como base)
   */
  private async generateInvoicePdf(invoiceNumber: string, data: {
    tipsterName: string;
    tipsterEmail?: string;
    tipsterLegalName?: string;
    tipsterDocumentType?: string;
    tipsterDocumentNumber?: string;
    tipsterCountry?: string;
    bankAccountType?: string;
    bankAccountDetails?: any;
    amountCents: number;
    currency: string;
    requestedAt: Date;
  }): Promise<string | null> {
    try {
      // Crear directorio para facturas si no existe
      const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Generar HTML de la factura
      const html = this.generateInvoiceHtml(invoiceNumber, data);
      
      // Guardar como HTML (en producción usaríamos puppeteer para PDF)
      const fileName = `${invoiceNumber}.html`;
      const filePath = path.join(invoicesDir, fileName);
      fs.writeFileSync(filePath, html);

      const baseUrl = process.env.BACKEND_URL || 'http://localhost:8001';
      return `${baseUrl}/invoices/${fileName}`;
    } catch (error) {
      this.logger.error(`Error generating invoice PDF: ${error}`);
      return null;
    }
  }

  /**
   * Generar HTML de factura
   */
  private generateInvoiceHtml(invoiceNumber: string, data: {
    tipsterName: string;
    tipsterEmail?: string;
    tipsterLegalName?: string;
    tipsterDocumentType?: string;
    tipsterDocumentNumber?: string;
    tipsterCountry?: string;
    bankAccountType?: string;
    bankAccountDetails?: any;
    amountCents: number;
    currency: string;
    requestedAt: Date;
  }): string {
    const amount = (data.amountCents / 100).toFixed(2);
    const date = data.requestedAt.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Formatear datos bancarios
    let bankInfo = '';
    if (data.bankAccountDetails) {
      if (data.bankAccountType === 'IBAN' && data.bankAccountDetails.iban) {
        bankInfo = `IBAN: ${data.bankAccountDetails.iban}`;
        if (data.bankAccountDetails.swift) {
          bankInfo += `<br>SWIFT/BIC: ${data.bankAccountDetails.swift}`;
        }
      } else if (data.bankAccountType === 'PAYPAL' && data.bankAccountDetails.paypalEmail) {
        bankInfo = `PayPal: ${data.bankAccountDetails.paypalEmail}`;
      } else if (data.bankAccountType === 'CRYPTO') {
        bankInfo = `Crypto: ${data.bankAccountDetails.cryptoAddress || 'N/A'}`;
      }
    }

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8f9fa; padding: 40px; color: #333; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header .logo { font-size: 32px; font-weight: bold; }
    .header .invoice-info { text-align: right; }
    .header .invoice-number { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .header .invoice-date { opacity: 0.9; }
    .body { padding: 40px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; margin-bottom: 12px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .info-block { }
    .info-block h3 { font-size: 16px; color: #111; margin-bottom: 8px; }
    .info-block p { color: #4b5563; line-height: 1.6; }
    .amount-box { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0; }
    .amount-label { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
    .amount-value { font-size: 48px; font-weight: bold; color: #1e3a8a; }
    .amount-currency { font-size: 24px; color: #3b82f6; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    .details-table th, .details-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .details-table th { background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
    .details-table td { color: #374151; }
    .footer { background: #f9fafb; padding: 24px 40px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    .status { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #fef3c7; color: #92400e; }
    @media print {
      body { background: white; padding: 0; }
      .invoice { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">ANTIA</div>
      <div class="invoice-info">
        <div class="invoice-number">${invoiceNumber}</div>
        <div class="invoice-date">${date}</div>
        <div style="margin-top: 8px;"><span class="status">Solicitud de Retiro</span></div>
      </div>
    </div>
    
    <div class="body">
      <div class="info-grid">
        <div class="info-block">
          <div class="section-title">Datos del Emisor</div>
          <h3>ANTIA PLATFORM S.L.</h3>
          <p>
            CIF: B-XXXXXXXX<br>
            Calle Principal 123<br>
            28001 Madrid, España<br>
            info@antia.com
          </p>
        </div>
        
        <div class="info-block">
          <div class="section-title">Datos del Beneficiario</div>
          <h3>${data.tipsterLegalName || data.tipsterName}</h3>
          <p>
            ${data.tipsterDocumentType ? `${data.tipsterDocumentType}: ${data.tipsterDocumentNumber || 'N/A'}<br>` : ''}
            ${data.tipsterCountry ? `País: ${data.tipsterCountry}<br>` : ''}
            ${data.tipsterEmail || ''}
          </p>
        </div>
      </div>
      
      <div class="amount-box">
        <div class="amount-label">Importe a Transferir</div>
        <div class="amount-value">${amount} <span class="amount-currency">${data.currency}</span></div>
      </div>
      
      <div class="section">
        <div class="section-title">Datos de Pago</div>
        <table class="details-table">
          <tr>
            <th>Método de Pago</th>
            <td>${data.bankAccountType || 'No especificado'}</td>
          </tr>
          <tr>
            <th>Datos de la Cuenta</th>
            <td>${bankInfo || 'No especificado'}</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">Concepto</div>
        <table class="details-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th style="text-align: right;">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Liquidación de ingresos por servicios de predicción deportiva</td>
              <td style="text-align: right; font-weight: 600;">${amount} ${data.currency}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="footer">
      <p>Este documento sirve como comprobante de solicitud de retiro.</p>
      <p style="margin-top: 8px;">ANTIA PLATFORM - www.antia.com</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Mapear documento de MongoDB a objeto
   */
  private mapWithdrawalDocument(doc: any) {
    return {
      id: doc._id?.$oid || doc._id?.toString() || doc._id,
      tipsterId: doc.tipster_id,
      amountCents: doc.amount_cents,
      currency: doc.currency,
      status: doc.status,
      invoiceNumber: doc.invoice_number,
      invoicePdfUrl: doc.invoice_pdf_url,
      tipsterName: doc.tipster_name,
      tipsterEmail: doc.tipster_email,
      tipsterLegalName: doc.tipster_legal_name,
      tipsterDocumentType: doc.tipster_document_type,
      tipsterDocumentNumber: doc.tipster_document_number,
      tipsterCountry: doc.tipster_country,
      bankAccountType: doc.bank_account_type,
      bankAccountDetails: doc.bank_account_details,
      tipsterNotes: doc.tipster_notes,
      adminNotes: doc.admin_notes,
      rejectionReason: doc.rejection_reason,
      periodStart: doc.period_start?.$date || doc.period_start,
      periodEnd: doc.period_end?.$date || doc.period_end,
      grossAmountCents: doc.gross_amount_cents,
      platformFeeCents: doc.platform_fee_cents,
      gatewayFeeCents: doc.gateway_fee_cents,
      paymentMethod: doc.payment_method,
      paymentReference: doc.payment_reference,
      paidBy: doc.paid_by,
      requestedAt: doc.requested_at?.$date || doc.requested_at,
      approvedAt: doc.approved_at?.$date || doc.approved_at,
      approvedBy: doc.approved_by,
      paidAt: doc.paid_at?.$date || doc.paid_at,
      rejectedAt: doc.rejected_at?.$date || doc.rejected_at,
      rejectedBy: doc.rejected_by,
      createdAt: doc.created_at?.$date || doc.created_at,
      updatedAt: doc.updated_at?.$date || doc.updated_at,
    };
  }
}
