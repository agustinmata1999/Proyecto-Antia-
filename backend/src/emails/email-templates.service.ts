import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailTemplatesService {
  private readonly appUrl: string;
  private readonly primaryColor = '#3B82F6';
  private readonly brandName = 'Antia';

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
  <title>${this.brandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: ${this.primaryColor};">${this.brandName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} ${this.brandName}. Todos los derechos reservados.
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

  private infoBox(items: { label: string; value: string }[]): string {
    const rows = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #6b7280;">${item.label}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <span style="font-size: 14px; font-weight: 600; color: #111827;">${item.value}</span>
        </td>
      </tr>
    `,
      )
      .join('');

    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; margin: 24px 0;">
        ${rows}
      </table>
    `;
  }

  private formatMoney(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount / 100);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  private formatDateOnly(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  private getBillingPeriodText(period?: string): string {
    switch (period) {
      case 'MONTHLY':
        return 'Mensual';
      case 'QUARTERLY':
        return 'Trimestral';
      case 'YEARLY':
        return 'Anual';
      default:
        return 'Mensual';
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  // =============================================
  // CLIENTE - COMPRA / ACCESO
  // =============================================

  purchaseConfirmation(data: {
    productName: string;
    tipsterName: string;
    billingType: 'ONE_TIME' | 'SUBSCRIPTION';
    billingPeriod?: string;
    amount: number;
    currency: string;
    orderId: string;
    purchaseDate: Date;
    hasChannel?: boolean;
  }): string {
    const billingTypeText =
      data.billingType === 'SUBSCRIPTION'
        ? `Suscripción (${this.getBillingPeriodText(data.billingPeriod)})`
        : 'Pago único';

    const channelNote =
      data.hasChannel === false
        ? `
        <div style="margin-top: 24px; padding: 16px; background-color: #dbeafe; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            <strong>📧 Información importante</strong><br>
            Este producto no incluye acceso a canal de Telegram. 
            El tipster te enviará la información del pronóstico por email a esta dirección.
          </p>
        </div>
      `
        : `
        <div style="margin-top: 24px; padding: 16px; background-color: #d1fae5; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #065f46;">
            <strong>📱 Acceso a Telegram</strong><br>
            En breve recibirás otro email con el link para acceder al canal privado de Telegram.
          </p>
        </div>
      `;

    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
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

      ${channelNote}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Guarda este email como comprobante de tu compra.
      </p>
    `;

    return this.baseTemplate(content, 'Tu pago fue procesado correctamente');
  }

  channelAccess(data: {
    productName: string;
    channelName: string;
    telegramLink: string;
    orderId?: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">🎉 ¡Accede a tu contenido!</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu compra de <strong>${data.productName}</strong> incluye acceso al canal premium <strong>${data.channelName}</strong>.
      </p>

      <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #065f46; font-weight: 600;">Para obtener tu acceso:</p>
        
        <ol style="margin: 0 0 20px; padding-left: 24px; color: #047857;">
          <li style="margin-bottom: 12px;">Haz clic en el botón verde de abajo</li>
          <li style="margin-bottom: 12px;">Se abrirá nuestro bot de Telegram (@Antiabetbot)</li>
          <li style="margin-bottom: 12px;">El bot verificará tu compra automáticamente</li>
          <li style="margin-bottom: 0;">Recibirás el enlace de acceso al canal</li>
        </ol>

        <div style="text-align: center;">
          ${this.button('🚀 Obtener Acceso en Telegram', data.telegramLink, '#10b981')}
        </div>
      </div>

      <div style="padding: 16px; background-color: #dbeafe; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>💡 ¿El botón no funciona?</strong><br>
          Abre Telegram, busca @Antiabetbot y envía el mensaje:<br>
          <code style="background-color: #bfdbfe; padding: 2px 6px; border-radius: 4px;">/start order_${data.orderId?.slice(-12) || ''}</code>
        </p>
      </div>

      <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>📱 ¿No tienes Telegram?</strong><br>
          Descárgalo gratis en <a href="https://telegram.org/" style="color: #92400e; text-decoration: underline;">telegram.org</a> (disponible para iOS, Android y PC)
        </p>
      </div>
    `;

    return this.baseTemplate(content, 'Tu acceso al canal premium está listo');
  }

  channelAccessApproved(data: { productName: string; channelName: string }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">✓</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Solicitud aprobada</h2>
      </div>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
        Tu solicitud para unirte al canal <strong>${data.channelName}</strong> ha sido aprobada.
      </p>

      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
        Ya podés acceder al contenido de <strong>${data.productName}</strong> desde Telegram.
      </p>
    `;

    return this.baseTemplate(content, 'Tu solicitud de acceso fue aprobada');
  }

  channelAccessDenied(data: { productName: string; channelName: string; reason: string }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #fee2e2; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">✕</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Acceso denegado</h2>
      </div>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6; text-align: center;">
        No pudimos validar tu acceso al canal <strong>${data.channelName}</strong>.
      </p>

      <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>Motivo:</strong> ${data.reason}
        </p>
      </div>

      <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
        Si crees que esto es un error, contacta con soporte.
      </p>
    `;

    return this.baseTemplate(content, 'No pudimos validar tu acceso');
  }

  channelLinkUpdated(data: { productName: string; channelName: string; newLink: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Canal actualizado</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        El tipster ha actualizado el canal de <strong>${data.productName}</strong>. 
        Usa el nuevo enlace para acceder a <strong>${data.channelName}</strong>.
      </p>

      <div style="text-align: center;">
        ${this.button('🔗 Nuevo enlace de acceso', data.newLink)}
      </div>
    `;

    return this.baseTemplate(content, 'El canal de tu producto ha sido actualizado');
  }

  // =============================================
  // CLIENTE - CUENTA
  // =============================================

  welcomeClient(data: { name?: string; email: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">¡Bienvenido a ${this.brandName}!</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        ${data.name ? `Hola ${data.name},` : 'Hola,'}<br><br>
        Tu cuenta ha sido creada exitosamente. Ya podés acceder a contenido exclusivo de los mejores tipsters.
      </p>

      <div style="text-align: center;">
        ${this.button('Ir al panel', `${this.appUrl}/dashboard/client`)}
      </div>

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Tu email registrado: <strong>${data.email}</strong>
      </p>
    `;

    return this.baseTemplate(content, 'Tu cuenta ha sido creada');
  }

  passwordReset(data: { resetLink: string; expiresIn: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Recuperar contraseña</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el botón de abajo para crear una nueva.
      </p>

      <div style="text-align: center;">
        ${this.button('Restablecer contraseña', data.resetLink)}
      </div>

      <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          ⏰ Este enlace expira en <strong>${data.expiresIn}</strong>.<br>
          Si no solicitaste esto, ignorá este email.
        </p>
      </div>
    `;

    return this.baseTemplate(content, 'Solicitud para restablecer contraseña');
  }

  emailVerification(data: { verificationLink: string; newEmail?: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Verificar email</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        ${
          data.newEmail
            ? `Hacé clic en el botón para confirmar tu nuevo email: <strong>${data.newEmail}</strong>`
            : 'Hacé clic en el botón para verificar tu dirección de email.'
        }
      </p>

      <div style="text-align: center;">
        ${this.button('Verificar email', data.verificationLink)}
      </div>
    `;

    return this.baseTemplate(content, 'Verificá tu dirección de email');
  }

  // =============================================
  // CLIENTE - SOPORTE
  // =============================================

  ticketCreated(data: { ticketId: string; subject: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Ticket creado</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Recibimos tu consulta y te responderemos lo antes posible.
      </p>

      ${this.infoBox([
        { label: 'Ticket #', value: data.ticketId },
        { label: 'Asunto', value: data.subject },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Te notificaremos por email cuando tengamos una respuesta.
      </p>
    `;

    return this.baseTemplate(content, 'Tu ticket de soporte fue creado');
  }

  ticketReplied(data: { ticketId: string; subject: string; replyPreview: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Nueva respuesta</h2>
      
      <p style="margin: 0 0 16px; font-size: 16px; color: #4b5563;">
        Tu ticket <strong>#${data.ticketId}</strong> tiene una nueva respuesta.
      </p>

      <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">
          "${data.replyPreview}..."
        </p>
      </div>

      <div style="text-align: center;">
        ${this.button('Ver conversación', `${this.appUrl}/support/ticket/${data.ticketId}`)}
      </div>
    `;

    return this.baseTemplate(content, 'Hay una nueva respuesta en tu ticket');
  }

  ticketClosed(data: { ticketId: string; subject: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Ticket cerrado</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu ticket <strong>#${data.ticketId}</strong> ha sido cerrado.
      </p>

      ${this.infoBox([
        { label: 'Ticket #', value: data.ticketId },
        { label: 'Asunto', value: data.subject },
        { label: 'Estado', value: 'Cerrado' },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Si necesitás más ayuda, podés abrir un nuevo ticket.
      </p>
    `;

    return this.baseTemplate(content, 'Tu ticket de soporte fue cerrado');
  }

  // =============================================
  // CLIENTE - SUSCRIPCIONES
  // =============================================

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
        <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">🔄</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Suscripción activada</h2>
      </div>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Tipster', value: data.tipsterName },
        { label: 'Frecuencia', value: this.getBillingPeriodText(data.billingPeriod) },
        { label: 'Monto', value: this.formatMoney(data.amount, data.currency) },
        { label: 'Próxima renovación', value: this.formatDateOnly(data.nextRenewalDate) },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
        Tu suscripción se renovará automáticamente. Podés cancelarla en cualquier momento.
      </p>
    `;

    return this.baseTemplate(content, 'Tu suscripción está activa');
  }

  subscriptionCancelled(data: { productName: string; accessUntil: Date }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Suscripción cancelada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu suscripción a <strong>${data.productName}</strong> ha sido cancelada.
      </p>

      <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          ⚠️ <strong>Importante:</strong> Tendrás acceso hasta el <strong>${this.formatDateOnly(data.accessUntil)}</strong>
        </p>
      </div>

      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Después de esta fecha, tu acceso al canal premium será removido automáticamente.
      </p>
    `;

    return this.baseTemplate(content, 'Tu suscripción ha sido cancelada');
  }

  subscriptionExpired(data: { productName: string; channelName?: string }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Suscripción expirada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu suscripción a <strong>${data.productName}</strong> ha expirado.
      </p>

      ${
        data.channelName
          ? `
        <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            Tu acceso al canal <strong>${data.channelName}</strong> ha sido removido.
          </p>
        </div>
      `
          : ''
      }

      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        Si deseas renovar tu suscripción, visita el canal del tipster para comprar nuevamente.
      </p>
    `;

    return this.baseTemplate(content, 'Tu suscripción ha expirado');
  }

  // =============================================
  // =============================================
  // TIPSTER - REGISTRO Y APROBACIÓN
  // =============================================

  /**
   * Email al tipster cuando envía su solicitud de registro
   */
  tipsterApplicationReceived(data: {
    tipsterName: string;
    email: string;
    applicationDate: Date;
  }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">📝</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">¡Solicitud recibida!</h2>
      </div>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Hola <strong>${data.tipsterName}</strong>,
      </p>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Hemos recibido tu solicitud para ser tipster en ${this.brandName}. Nuestro equipo revisará tu información y te notificaremos por email cuando tengamos una respuesta.
      </p>

      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>¿Qué sigue?</strong><br/>
          Revisaremos tu perfil y canales en las próximas 24-48 horas. Te enviaremos un email con el resultado.
        </p>
      </div>

      ${this.infoBox([
        { label: 'Email registrado', value: data.email },
        { label: 'Fecha de solicitud', value: this.formatDate(data.applicationDate) },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Si tienes alguna pregunta, puedes contactarnos respondiendo a este email.
      </p>
    `;

    return this.baseTemplate(content, 'Hemos recibido tu solicitud de tipster');
  }

  /**
   * Email al tipster cuando su solicitud es aprobada
   */
  tipsterApplicationApproved(data: {
    tipsterName: string;
    email: string;
    approvedDate: Date;
    loginUrl: string;
  }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">🎉</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">¡Felicitaciones!</h2>
        <p style="margin: 8px 0 0; font-size: 18px; color: #059669; font-weight: 600;">Tu solicitud ha sido aprobada</p>
      </div>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Hola <strong>${data.tipsterName}</strong>,
      </p>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        ¡Bienvenido a ${this.brandName}! Tu solicitud para ser tipster ha sido <strong style="color: #059669;">aprobada</strong>. Ya puedes acceder a tu panel y empezar a crear tus productos.
      </p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Importante:</strong><br/>
          Recuerda completar tu información de KYC (datos personales y método de cobro) para poder recibir tus ganancias.
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        ${this.button('Acceder a mi panel', data.loginUrl)}
      </div>

      <h3 style="margin: 32px 0 16px; font-size: 18px; font-weight: 600; color: #111827;">Próximos pasos:</h3>
      
      <ol style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
        <li>Completa tu información de KYC</li>
        <li>Conecta tu canal premium de Telegram</li>
        <li>Crea tu primer producto</li>
        <li>Comparte tu link y empieza a vender</li>
      </ol>

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Si tienes alguna duda, puedes crear un ticket de soporte desde tu panel.
      </p>
    `;

    return this.baseTemplate(content, '¡Tu solicitud de tipster ha sido aprobada!');
  }

  /**
   * Email al tipster cuando su solicitud es rechazada
   */
  tipsterApplicationRejected(data: {
    tipsterName: string;
    email: string;
    rejectedDate: Date;
    rejectionReason?: string;
  }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #fee2e2; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">😔</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Solicitud no aprobada</h2>
      </div>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Hola <strong>${data.tipsterName}</strong>,
      </p>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Lamentamos informarte que tu solicitud para ser tipster en ${this.brandName} no ha sido aprobada en esta ocasión.
      </p>

      ${
        data.rejectionReason
          ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            <strong>Motivo:</strong><br/>
            ${data.rejectionReason}
          </p>
        </div>
      `
          : ''
      }

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Si crees que esto es un error o deseas más información, puedes contactarnos respondiendo a este email.
      </p>

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
        Gracias por tu interés en ${this.brandName}.
      </p>
    `;

    return this.baseTemplate(content, 'Actualización sobre tu solicitud de tipster');
  }

  // =============================================
  // TIPSTER - VENTAS / ACCESOS
  // =============================================

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
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">💰</span>
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

  clientAccessedChannel(data: {
    productName: string;
    channelName: string;
    accessDate: Date;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Cliente accedió al canal</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Un cliente ha accedido exitosamente al canal <strong>${data.channelName}</strong> de tu producto <strong>${data.productName}</strong>.
      </p>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Canal', value: data.channelName },
        { label: 'Fecha de acceso', value: this.formatDate(data.accessDate) },
      ])}
    `;

    return this.baseTemplate(content, 'Un cliente accedió a tu canal');
  }

  accessAttemptRejected(data: {
    productName: string;
    channelName: string;
    reason: string;
    attemptDate: Date;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Intento de acceso rechazado</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Se rechazó un intento de acceso al canal <strong>${data.channelName}</strong>.
      </p>

      ${this.infoBox([
        { label: 'Producto', value: data.productName },
        { label: 'Canal', value: data.channelName },
        { label: 'Motivo', value: data.reason },
        { label: 'Fecha', value: this.formatDate(data.attemptDate) },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
        Esto puede indicar un intento de fraude o un error del usuario.
      </p>
    `;

    return this.baseTemplate(content, 'Intento de acceso rechazado');
  }

  // =============================================
  // TIPSTER - SUSCRIPCIONES
  // =============================================

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

  tipsterSubscriptionCancelled(data: { productName: string; clientEmail: string }): string {
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

  tipsterSubscriptionExpired(data: { productName: string; clientEmail: string }): string {
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

  // =============================================
  // TIPSTER - OPERACIÓN / LIQUIDACIONES
  // =============================================

  settlementGenerated(data: {
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    currency: string;
    salesCount: number;
  }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">💵</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Liquidación generada</h2>
      </div>

      ${this.infoBox([
        {
          label: 'Período',
          value: `${this.formatDateOnly(data.periodStart)} - ${this.formatDateOnly(data.periodEnd)}`,
        },
        { label: 'Ventas', value: data.salesCount.toString() },
        { label: 'Total a cobrar', value: this.formatMoney(data.totalAmount, data.currency) },
      ])}

      <div style="text-align: center;">
        ${this.button('Ver liquidación', `${this.appUrl}/dashboard/tipster`)}
      </div>
    `;

    return this.baseTemplate(content, 'Tu liquidación está lista');
  }

  settlementPaid(data: {
    amount: number;
    currency: string;
    paymentDate: Date;
    paymentMethod: string;
  }): string {
    const content = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">✓</span>
        </div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Pago procesado</h2>
      </div>

      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; text-align: center;">
        Tu liquidación ha sido pagada exitosamente.
      </p>

      ${this.infoBox([
        { label: 'Monto', value: this.formatMoney(data.amount, data.currency) },
        { label: 'Fecha', value: this.formatDate(data.paymentDate) },
        { label: 'Método', value: data.paymentMethod },
      ])}
    `;

    return this.baseTemplate(content, 'Tu pago ha sido procesado');
  }

  kycReminder(data: { tipsterName: string; daysRemaining?: number }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Completa tus datos de cobro</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Hola ${data.tipsterName}, necesitamos que completes tus datos de KYC y método de cobro para poder procesarte los pagos.
      </p>

      ${
        data.daysRemaining
          ? `
        <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            ⏰ Tienes <strong>${data.daysRemaining} días</strong> para completar esta información.
          </p>
        </div>
      `
          : ''
      }

      <div style="text-align: center;">
        ${this.button('Completar datos', `${this.appUrl}/dashboard/tipster`)}
      </div>
    `;

    return this.baseTemplate(content, 'Completa tus datos para recibir pagos');
  }

  configurationChanged(data: { changeDescription: string; effectiveDate: Date }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Cambio de configuración</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Se ha realizado un cambio en la configuración de tu cuenta que puede afectar tus ingresos.
      </p>

      ${this.infoBox([
        { label: 'Cambio', value: data.changeDescription },
        { label: 'Efectivo desde', value: this.formatDateOnly(data.effectiveDate) },
      ])}

      <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
        Si tienes dudas, contacta con soporte.
      </p>
    `;

    return this.baseTemplate(content, 'Cambio en la configuración de tu cuenta');
  }

  // =============================================
  // TIPSTER - AFILIACIÓN
  // =============================================

  affiliateMonthlySummary(data: {
    month: string;
    totalEarnings: number;
    currency: string;
    conversions: number;
    clicks: number;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Resumen de afiliación - ${data.month}</h2>
      
      ${this.infoBox([
        { label: 'Ganancias totales', value: this.formatMoney(data.totalEarnings, data.currency) },
        { label: 'Conversiones', value: data.conversions.toString() },
        { label: 'Clicks', value: data.clicks.toString() },
        {
          label: 'Tasa de conversión',
          value: data.clicks > 0 ? `${((data.conversions / data.clicks) * 100).toFixed(1)}%` : '0%',
        },
      ])}

      <div style="text-align: center;">
        ${this.button('Ver detalles', `${this.appUrl}/dashboard/tipster`)}
      </div>
    `;

    return this.baseTemplate(content, `Resumen de afiliación: ${data.month}`);
  }

  affiliateCsvUploaded(data: { fileName: string; recordsCount: number; uploadDate: Date }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">CSV de afiliación cargado</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Se ha cargado un nuevo archivo CSV con datos de conversiones de afiliación.
      </p>

      ${this.infoBox([
        { label: 'Archivo', value: data.fileName },
        { label: 'Registros', value: data.recordsCount.toString() },
        { label: 'Fecha', value: this.formatDate(data.uploadDate) },
      ])}
    `;

    return this.baseTemplate(content, 'Nuevo CSV de afiliación cargado');
  }

  // =============================================
  // TIPSTER - SEGURIDAD
  // =============================================

  newLoginDetected(data: {
    deviceInfo: string;
    location: string;
    loginDate: Date;
    ipAddress: string;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Nuevo inicio de sesión</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Se detectó un nuevo inicio de sesión en tu cuenta.
      </p>

      ${this.infoBox([
        { label: 'Dispositivo', value: data.deviceInfo },
        { label: 'Ubicación', value: data.location },
        { label: 'Fecha', value: this.formatDate(data.loginDate) },
        { label: 'IP', value: data.ipAddress },
      ])}

      <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          ⚠️ Si no fuiste vos, cambiá tu contraseña inmediatamente.
        </p>
      </div>
    `;

    return this.baseTemplate(content, 'Nuevo inicio de sesión detectado');
  }

  passwordChanged(data: { changeDate: Date }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Contraseña actualizada</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Tu contraseña ha sido cambiada exitosamente.
      </p>

      ${this.infoBox([{ label: 'Fecha del cambio', value: this.formatDate(data.changeDate) }])}

      <div style="padding: 16px; background-color: #fee2e2; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          ⚠️ Si no realizaste este cambio, contacta con soporte inmediatamente.
        </p>
      </div>
    `;

    return this.baseTemplate(content, 'Tu contraseña fue actualizada');
  }

  // =============================================
  // SUPERADMIN
  // =============================================

  newTipsterApplication(data: {
    tipsterName: string;
    email: string;
    applicationDate: Date;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Nueva solicitud de tipster</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Hay una nueva solicitud de tipster pendiente de revisión.
      </p>

      ${this.infoBox([
        { label: 'Nombre', value: data.tipsterName },
        { label: 'Email', value: data.email },
        { label: 'Fecha', value: this.formatDate(data.applicationDate) },
      ])}

      <div style="text-align: center;">
        ${this.button('Revisar solicitud', `${this.appUrl}/dashboard/admin`)}
      </div>
    `;

    return this.baseTemplate(content, 'Nueva solicitud de tipster');
  }

  tipsterKycCompleted(data: { tipsterName: string; email: string; completedDate: Date }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">KYC completado</h2>
      
      <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; line-height: 1.6;">
        Un tipster ha completado su información de KYC.
      </p>

      ${this.infoBox([
        { label: 'Tipster', value: data.tipsterName },
        { label: 'Email', value: data.email },
        { label: 'Fecha', value: this.formatDate(data.completedDate) },
      ])}

      <div style="text-align: center;">
        ${this.button('Ver información', `${this.appUrl}/dashboard/admin`)}
      </div>
    `;

    return this.baseTemplate(content, 'Un tipster completó su KYC');
  }

  operationalAlert(data: {
    alertType: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
  }): string {
    const severityColors = {
      low: '#dbeafe',
      medium: '#fef3c7',
      high: '#fed7aa',
      critical: '#fee2e2',
    };
    const severityTextColors = {
      low: '#1e40af',
      medium: '#92400e',
      high: '#c2410c',
      critical: '#991b1b',
    };

    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Alerta operativa</h2>
      
      <div style="padding: 16px; background-color: ${severityColors[data.severity]}; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: ${severityTextColors[data.severity]};">
          <strong>${data.alertType.toUpperCase()}</strong>
        </p>
      </div>

      ${this.infoBox([
        { label: 'Descripción', value: data.description },
        { label: 'Severidad', value: data.severity.toUpperCase() },
        { label: 'Fecha', value: this.formatDate(data.timestamp) },
      ])}
    `;

    return this.baseTemplate(content, `Alerta: ${data.alertType}`);
  }

  dailyActivitySummary(data: {
    date: Date;
    newUsers: number;
    totalSales: number;
    totalRevenue: number;
    currency: string;
    newTipsters: number;
    activeProducts: number;
  }): string {
    const content = `
      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">Resumen diario - ${this.formatDateOnly(data.date)}</h2>
      
      ${this.infoBox([
        { label: 'Nuevos usuarios', value: data.newUsers.toString() },
        { label: 'Ventas totales', value: data.totalSales.toString() },
        { label: 'Ingresos', value: this.formatMoney(data.totalRevenue, data.currency) },
        { label: 'Nuevos tipsters', value: data.newTipsters.toString() },
        { label: 'Productos activos', value: data.activeProducts.toString() },
      ])}

      <div style="text-align: center;">
        ${this.button('Ver dashboard', `${this.appUrl}/dashboard/admin`)}
      </div>
    `;

    return this.baseTemplate(content, `Resumen del día: ${this.formatDateOnly(data.date)}`);
  }
}
