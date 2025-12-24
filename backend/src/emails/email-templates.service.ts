import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailTemplatesService {
  private readonly appUrl: string;
  private readonly primaryColor = '#3B82F6';
  private readonly logoUrl = 'https://via.placeholder.com/150x50?text=Antia';

  constructor(private config: ConfigService) {
    this.appUrl = this.config.get<string>('APP_URL') || 'https://antia.com';
  }

  /**
   * Base template wrapper
   */
  private baseTemplate(content: string, preheader: string = ''): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antia</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 12px 24px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <!-- Main container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${this.primaryColor};">Antia</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Antia. Todos los derechos reservados.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Este email fue enviado automáticamente. Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Button component
   */
  private button(text: string, url: string, color: string = this.primaryColor): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td style="background-color: ${color}; border-radius: 6px;">
            <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Info box component
   */
  private infoBox(items: { label: string; value: string }[]): string {
    const rows = items.map(item => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #6b7280;">${item.label}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <span style="font-size: 14px; font-weight: 600; color: #111827;">${item.value}</span>
        </td>
      </tr>
    `).join('');

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; margin: 24px 0;">
        ${rows}
      </table>
    `;
  }

  /**
   * Format currency
   */
  private formatMoney(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount / 100);
  }

  /**
   * Format date
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  /**
   * =============================================
   * CLIENT TEMPLATES
   * =============================================
   */

  /**
   * 1.1 Confirmación de compra
   */
  purchaseConfirmation(data: {
    productName: string;
    tipsterName: string;
    billingType: 'ONE_TIME' | 'SUBSCRIPTION';
    billingPeriod?: string;
    amount: number;
    currency: string;
    orderId: string;
    purchaseDate: Date;
  }): string {
    const billingTypeText = data.billingType === 'SUBSCRIPTION' 
      ? `Suscripción (${this.getBillingPeriodText(data.billingPeriod)})`
      : 'Pago único';

    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px;">✓</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">¡Pago confirmado!</h2>
        <p style="margin: 8px 0 0; font-size: 16px; color: #6b7280;">Tu compra ha sido procesada correctamente</p>
      </div>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Tipster', value: data.tipsterName },
        { label: 'Tipo', value: billingTypeText },
        { label: 'Fecha', value: this.formatDate(data.purchaseDate) },
        { label: 'Total pagado', value: this.formatMoney(data.amount, data.currency) },
        { label: 'ID de compra', value: data.orderId.slice(-8).toUpperCase() },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Guarda este email como comprobante de tu compra.
      </p>
    `;

    return this.baseTemplate(content, 'Tu pago fue procesado correctamente');
  }

  /**
   * 1.2 Acceso al canal
   */
  channelAccess(data: {
    productName: string;
    channelName: string;
    telegramLink: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Accede a tu contenido</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu compra de <strong>${data.productName}</strong> incluye acceso al canal premium <strong>${data.channelName}</strong>.
      </p>

      <p style="margin: 0 0 8px; font-size: 16px; color: #4b5563;">Para acceder, seguí estos pasos:</p>
      
      <ol style="margin: 0 0 24px; padding-left: 24px; color: #4b5563;">
        <li style="margin-bottom: 8px;">Hacé clic en el botón de abajo</li>
        <li style="margin-bottom: 8px;">Se abrirá Telegram automáticamente</li>
        <li style="margin-bottom: 8px;">Uníte al canal privado</li>
      </ol>

      <div style="text-align: center;">
        ${this.button('🚀 Acceder a Telegram', data.telegramLink)}
      </div>

      <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>💡 ¿No tenés Telegram?</strong><br>
          Descargalo gratis en <a href="https://telegram.org/" style="color: #92400e;">telegram.org</a>
        </p>
      </div>
    `;

    return this.baseTemplate(content, 'Tu acceso al canal premium está listo');
  }

  /**
   * 1.3a Suscripción activada
   */
  subscriptionActivated(data: {
    productName: string;
    tipsterName: string;
    billingPeriod: string;
    nextRenewalDate: Date;
    amount: number;
    currency: string;
  }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 16px;">
          <span style="font-size: 32px; line-height: 64px;">🔄</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Suscripción activada</h2>
      </div>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Tipster', value: data.tipsterName },
        { label: 'Frecuencia', value: this.getBillingPeriodText(data.billingPeriod) },
        { label: 'Monto', value: this.formatMoney(data.amount, data.currency) },
        { label: 'Próxima renovación', value: this.formatDate(data.nextRenewalDate) },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Tu suscripción se renovará automáticamente. Podés cancelarla en cualquier momento.
      </p>
    `;

    return this.baseTemplate(content, 'Tu suscripción está activa');
  }

  /**
   * 1.3b Suscripción cancelada
   */
  subscriptionCancelled(data: {
    productName: string;
    accessUntil: Date;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Suscripción cancelada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu suscripción a <strong>${data.productName}</strong> ha sido cancelada.
      </p>

      <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Importante:</strong> Tendrás acceso hasta el <strong>${this.formatDate(data.accessUntil)}</strong>
        </p>
      </div>

      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Después de esta fecha, tu acceso al canal premium será removido automáticamente.
      </p>
    `;

    return this.baseTemplate(content, 'Tu suscripción ha sido cancelada');
  }

  /**
   * 1.3c Suscripción expirada
   */
  subscriptionExpired(data: {
    productName: string;
    channelName?: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Suscripción expirada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu suscripción a <strong>${data.productName}</strong> ha expirado.
      </p>

      ${data.channelName ? `
        <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            Tu acceso al canal <strong>${data.channelName}</strong> ha sido removido.
          </p>
        </div>
      ` : ''}

      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Si deseas renovar tu suscripción, visita el canal del tipster para comprar nuevamente.
      </p>
    `;

    return this.baseTemplate(content, 'Tu suscripción ha expirado');
  }

  /**
   * =============================================
   * TIPSTER TEMPLATES
   * =============================================
   */

  /**
   * 2.1 Nueva venta
   */
  newSaleNotification(data: {
    productName: string;
    billingType: 'ONE_TIME' | 'SUBSCRIPTION';
    saleDate: Date;
    netAmount: number;
    currency: string;
    panelUrl: string;
  }): string {
    const billingTypeText = data.billingType === 'SUBSCRIPTION' ? 'Suscripción' : 'Pago único';

    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px;">
          <span style="font-size: 32px; line-height: 64px;">💰</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">¡Nueva venta!</h2>
      </div>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Tipo', value: billingTypeText },
        { label: 'Fecha', value: this.formatDate(data.saleDate) },
        { label: 'Tu ingreso neto', value: this.formatMoney(data.netAmount, data.currency) },
      ])}

      <div style="text-align: center;">
        ${this.button('Ver en el panel', data.panelUrl)}
      </div>
    `;

    return this.baseTemplate(content, `Nueva venta: ${data.productName}`);
  }

  /**
   * 2.2a Nueva suscripción (tipster)
   */
  tipsterSubscriptionStarted(data: {
    productName: string;
    clientEmail: string;
    billingPeriod: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Nueva suscripción</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Un cliente se ha suscrito a tu producto <strong>${data.productName}</strong>.
      </p>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Cliente', value: this.maskEmail(data.clientEmail) },
        { label: 'Frecuencia', value: this.getBillingPeriodText(data.billingPeriod) },
      ])}
    `;

    return this.baseTemplate(content, 'Tienes una nueva suscripción');
  }

  /**
   * 2.2b Suscripción cancelada (tipster)
   */
  tipsterSubscriptionCancelled(data: {
    productName: string;
    clientEmail: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Suscripción cancelada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Un cliente ha cancelado su suscripción a <strong>${data.productName}</strong>.
      </p>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Cliente', value: this.maskEmail(data.clientEmail) },
      ])}
    `;

    return this.baseTemplate(content, 'Una suscripción fue cancelada');
  }

  /**
   * 2.2c Suscripción expirada (tipster)
   */
  tipsterSubscriptionExpired(data: {
    productName: string;
    clientEmail: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Suscripción expirada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        La suscripción de un cliente a <strong>${data.productName}</strong> ha expirado.
      </p>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Cliente', value: this.maskEmail(data.clientEmail) },
      ])}
    `;

    return this.baseTemplate(content, 'Una suscripción ha expirado');
  }

  /**
   * =============================================
   * HELPERS
   * =============================================
   */

  private getBillingPeriodText(period?: string): string {
    switch (period) {
      case 'MONTHLY': return 'Mensual';
      case 'QUARTERLY': return 'Trimestral';
      case 'YEARLY': return 'Anual';
      default: return 'Mensual';
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }
}
