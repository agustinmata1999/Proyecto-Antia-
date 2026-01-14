import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { GeolocationService, GeoLocationResult } from './geolocation.service';
import { RedsysService } from './redsys.service';
import { CommissionsService } from '../commissions/commissions.service';
import { EmailService } from '../emails/emails.service';
import { NotificationsService } from '../notifications/notifications.service';
import Stripe from 'stripe';

export interface CreateCheckoutDto {
  productId: string;
  originUrl: string;
  isGuest: boolean;
  email?: string;
  phone?: string;
  telegramUserId?: string;
  telegramUsername?: string;
  clientIp?: string; // IP for geolocation
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
  orderId: string;
  gateway: 'stripe' | 'redsys';
  country: string;
}

// Feature flags for payment methods
export interface PaymentFeatureFlags {
  cryptoEnabled: boolean;
  redsysEnabled: boolean;
  stripeEnabled: boolean;
}

@Injectable()
export class CheckoutService {
  private stripe: Stripe;
  private readonly logger = new Logger(CheckoutService.name);

  // Feature flags (can be loaded from DB or config in production)
  private featureFlags: PaymentFeatureFlags = {
    cryptoEnabled: false, // Future feature
    redsysEnabled: true,
    stripeEnabled: true,
  };

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private telegramService: TelegramService,
    private geolocationService: GeolocationService,
    private redsysService: RedsysService,
    private commissionsService: CommissionsService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_API_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_API_KEY not configured');
    }
    this.stripe = new Stripe(stripeKey || '');
  }

  /**
   * Detect country from IP and determine which gateway to use
   */
  async detectGateway(clientIp: string): Promise<{
    gateway: 'stripe' | 'redsys';
    geo: GeoLocationResult;
    availableMethods: string[];
  }> {
    const geo = await this.geolocationService.detectCountry(clientIp);

    let gateway: 'stripe' | 'redsys' = 'stripe';
    let availableMethods: string[] = ['card'];

    // If in Spain and Redsys is enabled, use Redsys
    if (geo.isSpain && this.featureFlags.redsysEnabled && this.redsysService.isAvailable()) {
      gateway = 'redsys';
      availableMethods = ['card', 'bizum'];
    }

    this.logger.log(`Gateway selection for ${clientIp}: ${gateway} (country: ${geo.country})`);

    return { gateway, geo, availableMethods };
  }

  /**
   * Get feature flags for crypto payments (future)
   */
  getFeatureFlags(): PaymentFeatureFlags {
    return this.featureFlags;
  }

  async createCheckoutSession(dto: CreateCheckoutDto): Promise<CheckoutSessionResponse> {
    // 1. Get product from database
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado o no está disponible');
    }

    // Get tipster info
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    });

    // 2. Detect country and determine gateway
    const clientIp = dto.clientIp || '127.0.0.1';
    const { gateway, geo } = await this.detectGateway(clientIp);

    // Calculate commission based on gateway
    const commissionRate = gateway === 'redsys' ? this.redsysService.getCommissionRate() : 2.9; // Stripe ~2.9%
    const commissionCents = Math.round(product.priceCents * (commissionRate / 100));

    // 3. Create order in database with geo info
    const orderId = await this.createPendingOrderWithGeo({
      productId: dto.productId,
      tipsterId: product.tipsterId,
      amountCents: product.priceCents,
      currency: product.currency,
      email: dto.email,
      phone: dto.phone,
      telegramUserId: dto.telegramUserId,
      telegramUsername: dto.telegramUsername,
      isGuest: dto.isGuest,
      country: geo.country,
      countryName: geo.countryName,
      gateway,
      commissionCents,
      commissionRate,
    });

    // 4. Build success and cancel URLs
    const successUrl = `${dto.originUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const cancelUrl = `${dto.originUrl}/checkout/cancel?order_id=${orderId}`;
    const webhookUrl = `${this.config.get('APP_URL')}/api/checkout/webhook/redsys`;

    // 5. Create payment session based on gateway
    if (gateway === 'redsys' && this.redsysService.isAvailable()) {
      return this.createRedsysSession(
        orderId,
        product,
        successUrl,
        cancelUrl,
        webhookUrl,
        geo.country,
      );
    } else {
      return this.createStripeSession(
        orderId,
        product,
        tipster,
        successUrl,
        cancelUrl,
        dto,
        geo.country,
      );
    }
  }

  /**
   * Create Stripe checkout session
   */
  private async createStripeSession(
    orderId: string,
    product: any,
    tipster: any,
    successUrl: string,
    cancelUrl: string,
    dto: CreateCheckoutDto,
    country: string,
  ): Promise<CheckoutSessionResponse> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: product.currency.toLowerCase(),
              product_data: {
                name: product.title,
                description:
                  product.description || `Pronóstico de ${tipster?.publicName || 'Tipster'}`,
              },
              unit_amount: product.priceCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: dto.email || undefined,
        metadata: {
          orderId,
          productId: dto.productId,
          tipsterId: product.tipsterId,
          telegramUserId: dto.telegramUserId || '',
          telegramUsername: dto.telegramUsername || '',
          isGuest: dto.isGuest ? 'true' : 'false',
          country,
        },
      });

      await this.updateOrderWithSession(orderId, session.id);

      this.logger.log(
        `Created Stripe session ${session.id} for order ${orderId} (country: ${country})`,
      );

      return {
        url: session.url!,
        sessionId: session.id,
        orderId,
        gateway: 'stripe',
        country,
      };
    } catch (error) {
      this.logger.error('Error creating Stripe session:', error);
      throw new BadRequestException('Error al crear la sesión de pago');
    }
  }

  /**
   * Create Redsys payment session (for Spain)
   */
  private async createRedsysSession(
    orderId: string,
    product: any,
    successUrl: string,
    cancelUrl: string,
    webhookUrl: string,
    country: string,
  ): Promise<CheckoutSessionResponse> {
    try {
      // Default to card for now (Bizum can be selected in checkout UI)
      const result = await this.redsysService.createPaymentSession(
        orderId,
        product.priceCents,
        product.currency,
        'CARD',
        successUrl.replace('{CHECKOUT_SESSION_ID}', orderId),
        cancelUrl,
        webhookUrl,
      );

      await this.updateOrderWithSession(orderId, result.transactionId);

      this.logger.log(
        `Created Redsys session ${result.transactionId} for order ${orderId} (country: ${country})`,
      );

      return {
        url: result.redirectUrl,
        sessionId: result.transactionId,
        orderId,
        gateway: 'redsys',
        country,
      };
    } catch (error) {
      this.logger.error('Error creating Redsys session:', error);
      // Fallback to Stripe if Redsys fails
      this.logger.warn('Falling back to Stripe due to Redsys error');
      throw new BadRequestException('Error al crear la sesión de pago con Redsys');
    }
  }

  /**
   * Create pending order with geolocation data
   */
  private async createPendingOrderWithGeo(data: {
    productId: string;
    tipsterId: string;
    amountCents: number;
    currency: string;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    telegramUsername?: string;
    isGuest: boolean;
    country: string;
    countryName: string;
    gateway: string;
    commissionCents: number;
    commissionRate: number;
  }): Promise<string> {
    const now = new Date();
    const orderId = this.generateOrderId();

    await this.prisma.$runCommandRaw({
      insert: 'orders',
      documents: [
        {
          _id: { $oid: orderId },
          product_id: data.productId,
          tipster_id: data.tipsterId,
          amount_cents: data.amountCents,
          currency: data.currency,
          email_backup: data.email || null,
          phone_backup: data.phone || null,
          telegram_user_id: data.telegramUserId || null,
          telegram_username: data.telegramUsername || null,
          status: 'PENDING',
          payment_provider: data.gateway,
          // Geolocation data
          detected_country: data.country,
          detected_country_name: data.countryName,
          // Commission data
          commission_cents: data.commissionCents,
          commission_rate: data.commissionRate,
          meta: { isGuest: data.isGuest },
          created_at: { $date: now.toISOString() },
          updated_at: { $date: now.toISOString() },
        },
      ],
    });

    return orderId;
  }

  async getCheckoutStatus(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      return {
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      };
    } catch (error) {
      this.logger.error('Error retrieving checkout status:', error);
      throw new NotFoundException('Sesión de pago no encontrada');
    }
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        // For testing without webhook secret
        event = JSON.parse(payload.toString());
      }
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handlePaymentSuccess(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handlePaymentExpired(session);
        break;
      }
    }

    return { received: true };
  }

  /**
   * Handle Redsys webhook notification
   */
  async handleRedsysWebhook(body: any) {
    const result = await this.redsysService.processWebhook(body);

    if (!result.success || !result.orderId) {
      this.logger.warn('Redsys webhook processing failed or no orderId');
      return { received: true, processed: false };
    }

    this.logger.log(`Processing Redsys webhook for order ${result.orderId}`);

    // Update order status
    const status = result.success ? 'PAGADA' : 'FAILED';
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: result.orderId } },
          u: {
            $set: {
              status,
              payment_provider: 'redsys',
              provider_order_id: result.transactionId,
              response_code: result.responseCode,
              authorization_code: result.authCode,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    // If successful, send Telegram notification
    if (result.success) {
      const order = await this.getOrderById(result.orderId);
      if (order?.telegramUserId) {
        await this.telegramService.notifyPaymentSuccess(
          order.telegramUserId,
          result.orderId,
          order.productId,
        );
      }

      // Calculate commissions for proper net amount
      if (order) {
        const commissions = await this.calculateOrderCommissions(
          order.tipsterId,
          order.amountCents || 0,
          'redsys',
        );

        // Notify tipster with net amount
        await this.telegramService.notifyTipsterNewSale(
          order.tipsterId,
          result.orderId,
          order.productId,
          order.amountCents,
          order.currency,
          order.emailBackup,
          order.telegramUsername,
          commissions.netAmountCents, // Pass net amount
        );
      }

      // =============================================
      // SEND EMAILS AFTER SUCCESSFUL REDSYS PAYMENT
      // =============================================
      await this.sendPostPaymentEmails(result.orderId);
    }

    return { received: true, processed: true };
  }

  async handlePaymentSuccess(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.error('No orderId in session metadata');
      return;
    }

    this.logger.log(`Processing successful payment for order ${orderId}`);

    // Update order status
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              status: 'PAGADA',
              payment_provider: 'stripe',
              provider_order_id: session.id,
              payment_method: 'card',
              paid_at: { $date: new Date().toISOString() },
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    // Send Telegram notification if user came from Telegram
    const telegramUserId = session.metadata?.telegramUserId;
    if (telegramUserId) {
      await this.telegramService.notifyPaymentSuccess(
        telegramUserId,
        orderId,
        session.metadata?.productId || '',
      );
    }

    // =============================================
    // SEND EMAILS AFTER SUCCESSFUL STRIPE PAYMENT
    // =============================================
    await this.sendPostPaymentEmails(orderId);
  }

  async handlePaymentExpired(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              status: 'EXPIRED',
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });
  }

  async verifyPaymentAndGetOrder(sessionId: string, orderId: string) {
    // Get session status from Stripe
    const status = await this.getCheckoutStatus(sessionId);

    if (status.paymentStatus === 'paid') {
      // Update order if not already updated
      const order = await this.getOrderById(orderId);

      if (order && order.status === 'PENDING') {
        await this.prisma.$runCommandRaw({
          update: 'orders',
          updates: [
            {
              q: { _id: { $oid: orderId } },
              u: {
                $set: {
                  status: 'PAGADA',
                  payment_provider: 'stripe',
                  provider_order_id: sessionId,
                  payment_method: 'card',
                  paid_at: { $date: new Date().toISOString() },
                  updated_at: { $date: new Date().toISOString() },
                },
              },
            },
          ],
        });

        // =============================================
        // SEND EMAILS - First time payment confirmed
        // =============================================
        await this.sendPostPaymentEmails(orderId);
      }
    }

    // Get updated order
    const order = await this.getOrderById(orderId);

    // Get product info
    const product = order
      ? await this.prisma.product.findUnique({
          where: { id: order.productId },
        })
      : null;

    // Get tipster info
    const tipster = product
      ? await this.prisma.tipsterProfile.findUnique({
          where: { id: product.tipsterId },
        })
      : null;

    return {
      ...status,
      order,
      product,
      tipster,
    };
  }

  private async createPendingOrder(data: {
    productId: string;
    tipsterId: string;
    amountCents: number;
    currency: string;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    telegramUsername?: string;
    isGuest: boolean;
  }): Promise<string> {
    const now = new Date();
    const orderId = this.generateOrderId();

    await this.prisma.$runCommandRaw({
      insert: 'orders',
      documents: [
        {
          _id: { $oid: orderId },
          product_id: data.productId,
          tipster_id: data.tipsterId,
          amount_cents: data.amountCents,
          currency: data.currency,
          email_backup: data.email || null,
          phone_backup: data.phone || null,
          telegram_user_id: data.telegramUserId || null,
          telegram_username: data.telegramUsername || null,
          status: 'PENDING',
          payment_provider: 'stripe',
          meta: { isGuest: data.isGuest },
          created_at: { $date: now.toISOString() },
          updated_at: { $date: now.toISOString() },
        },
      ],
    });

    return orderId;
  }

  private async updateOrderWithSession(orderId: string, sessionId: string) {
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              provider_order_id: sessionId,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });
  }

  private async getOrderById(orderId: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: { _id: { $oid: orderId } },
      limit: 1,
    })) as any;

    if (result.cursor?.firstBatch?.length > 0) {
      const doc = result.cursor.firstBatch[0];
      return {
        id: doc._id.$oid || doc._id,
        productId: doc.product_id,
        tipsterId: doc.tipster_id,
        amountCents: doc.amount_cents,
        currency: doc.currency,
        status: doc.status,
        emailBackup: doc.email_backup,
        phoneBackup: doc.phone_backup,
        telegramUserId: doc.telegram_user_id,
        telegramUsername: doc.telegram_username,
        paymentProvider: doc.payment_provider,
        providerOrderId: doc.provider_order_id,
        // Commission fields
        gatewayFeeCents: doc.gateway_fee_cents,
        gatewayFeePercent: doc.gateway_fee_percent,
        platformFeeCents: doc.platform_fee_cents,
        platformFeePercent: doc.platform_fee_percent,
        netAmountCents: doc.net_amount_cents,
        createdAt: doc.created_at,
      };
    }
    return null;
  }

  private generateOrderId(): string {
    // Generate a MongoDB ObjectId-like string
    const timestamp = Math.floor(Date.now() / 1000)
      .toString(16)
      .padStart(8, '0');
    const random = Math.random().toString(16).substring(2, 18).padStart(16, '0');
    return timestamp + random.substring(0, 16);
  }

  async getProductForCheckout(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado');
    }

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    });

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      priceCents: product.priceCents,
      currency: product.currency,
      billingType: product.billingType,
      validityDays: product.validityDays,
      tipster: tipster
        ? {
            id: tipster.id,
            publicName: tipster.publicName,
            avatarUrl: tipster.avatarUrl,
          }
        : null,
    };
  }

  /**
   * Simulate a successful payment (for testing purposes)
   */
  async simulateSuccessfulPayment(orderId: string) {
    const order = await this.getOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === 'PAGADA') {
      return {
        success: true,
        message: 'La orden ya está pagada',
        order,
      };
    }

    // Calculate commissions
    const commissions = await this.calculateOrderCommissions(
      order.tipsterId,
      order.amountCents || 0,
      'stripe_simulated',
    );

    this.logger.log(
      `Simulated payment commissions: gross=${order.amountCents}, gateway=${commissions.gatewayFeeCents}, platform=${commissions.platformFeeCents}, net=${commissions.netAmountCents}`,
    );

    // Update order status to PAGADA with commission data
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              status: 'PAGADA',
              payment_provider: 'stripe_simulated',
              payment_method: 'card_simulated',
              paid_at: { $date: new Date().toISOString() },
              // Commission fields
              gateway_fee_cents: commissions.gatewayFeeCents,
              gateway_fee_percent: commissions.gatewayFeePercent,
              platform_fee_cents: commissions.platformFeeCents,
              platform_fee_percent: commissions.platformFeePercent,
              net_amount_cents: commissions.netAmountCents,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    // Send Telegram notification if user came from Telegram
    let telegramResult = null;
    if (order.telegramUserId) {
      telegramResult = await this.telegramService.notifyPaymentSuccess(
        order.telegramUserId,
        orderId,
        order.productId,
      );
    }

    // Get updated order
    const updatedOrder = await this.getOrderById(orderId);

    return {
      success: true,
      message: 'Pago simulado exitosamente',
      order: updatedOrder,
      telegramNotification: telegramResult,
    };
  }

  /**
   * Complete payment and send notifications
   */
  async completePaymentAndNotify(orderId: string, sessionId?: string) {
    const order = await this.getOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // If already paid, just return the order info
    if (order.status === 'PAGADA') {
      const product = await this.prisma.product.findUnique({
        where: { id: order.productId },
      });
      const tipster = product
        ? await this.prisma.tipsterProfile.findUnique({
            where: { id: product.tipsterId },
          })
        : null;

      return {
        success: true,
        alreadyPaid: true,
        order,
        product,
        tipster,
      };
    }

    // Calculate commissions
    const commissions = await this.calculateOrderCommissions(
      order.tipsterId,
      order.amountCents || 0,
      order.paymentProvider || 'stripe',
    );

    // Update order status to PAGADA with commission data
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              status: 'PAGADA',
              payment_provider: order.paymentProvider || 'stripe',
              provider_order_id: sessionId || order.providerOrderId,
              payment_method: 'card',
              paid_at: { $date: new Date().toISOString() },
              // Commission fields
              gateway_fee_cents: commissions.gatewayFeeCents,
              gateway_fee_percent: commissions.gatewayFeePercent,
              platform_fee_cents: commissions.platformFeeCents,
              platform_fee_percent: commissions.platformFeePercent,
              net_amount_cents: commissions.netAmountCents,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    this.logger.log(
      `Order ${orderId} completed with commissions: gross=${order.amountCents}, gateway=${commissions.gatewayFeeCents}, platform=${commissions.platformFeeCents}, net=${commissions.netAmountCents}`,
    );

    // Get product and tipster info first
    const product = await this.prisma.product.findUnique({
      where: { id: order.productId },
    });
    const tipster = product
      ? await this.prisma.tipsterProfile.findUnique({
          where: { id: product.tipsterId },
        })
      : null;

    // Send Telegram notification to BUYER if user came from Telegram
    let telegramResult = null;
    if (order.telegramUserId) {
      telegramResult = await this.telegramService.notifyPaymentSuccess(
        order.telegramUserId,
        orderId,
        order.productId,
      );
    }

    // Send notification to TIPSTER about new sale (with net amount)
    if (product) {
      await this.telegramService.notifyTipsterNewSale(
        product.tipsterId,
        orderId,
        order.productId,
        order.amountCents,
        order.currency,
        order.emailBackup,
        order.telegramUsername,
        commissions.netAmountCents, // Pass net amount for correct earnings
      );
    }

    // =============================================
    // SEND EMAILS
    // =============================================

    // 1. Email de confirmación de compra al cliente
    if (order.emailBackup) {
      try {
        await this.emailService.sendPurchaseConfirmation({
          email: order.emailBackup,
          productName: product?.title || 'Producto',
          tipsterName: tipster?.publicName || 'Tipster',
          billingType: (product?.billingType as 'ONE_TIME' | 'SUBSCRIPTION') || 'ONE_TIME',
          billingPeriod: product?.billingPeriod,
          amount: order.amountCents || 0,
          currency: order.currency || 'EUR',
          orderId: orderId,
          purchaseDate: new Date(),
          hasChannel: !!product?.telegramChannelId, // Indica si tiene canal o no
        });
        this.logger.log(`📧 Purchase confirmation email sent to ${order.emailBackup}`);
      } catch (emailError) {
        this.logger.error('Failed to send purchase confirmation email:', emailError.message);
      }

      // 2. Email de acceso al canal (si tiene canal)
      if (product?.telegramChannelId) {
        try {
          // Buscar el canal para obtener el link
          const channelResult = (await this.prisma.$runCommandRaw({
            find: 'telegram_channels',
            filter: { channel_id: product.telegramChannelId, is_active: true },
            projection: { invite_link: 1, channel_title: 1 },
            limit: 1,
          })) as any;
          const channel = channelResult.cursor?.firstBatch?.[0];

          if (channel?.invite_link) {
            await this.emailService.sendChannelAccess({
              email: order.emailBackup,
              productName: product.title,
              channelName: channel.channel_title || 'Canal Premium',
              telegramLink: channel.invite_link,
              orderId: orderId,
            });
            this.logger.log(`📧 Channel access email sent to ${order.emailBackup}`);
          }
        } catch (emailError) {
          this.logger.error('Failed to send channel access email:', emailError.message);
        }
      }
    }

    // 3. Email y notificación al tipster sobre la venta
    if (tipster) {
      try {
        // Obtener el user asociado al tipster para el email
        const tipsterUser = await this.prisma.user.findUnique({
          where: { id: tipster.userId },
        });

        if (tipsterUser?.email) {
          await this.notificationsService.notifyNewSale({
            tipsterId: tipster.id,
            tipsterUserId: tipster.userId,
            tipsterEmail: tipsterUser.email,
            productName: product?.title || 'Producto',
            billingType: (product?.billingType as 'ONE_TIME' | 'SUBSCRIPTION') || 'ONE_TIME',
            netAmount: commissions.netAmountCents,
            currency: order.currency || 'EUR',
            orderId: orderId,
          });
          this.logger.log(`📧 Sale notification sent to tipster ${tipsterUser.email}`);
        }
      } catch (emailError) {
        this.logger.error('Failed to send tipster sale notification:', emailError.message);
      }
    }

    // Get updated order
    const updatedOrder = await this.getOrderById(orderId);

    return {
      success: true,
      order: updatedOrder,
      product,
      tipster,
      telegramNotification: telegramResult,
    };
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(orderId: string) {
    const order = await this.getOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: order.productId },
    });
    const tipster = product
      ? await this.prisma.tipsterProfile.findUnique({
          where: { id: product.tipsterId },
        })
      : null;

    return {
      order,
      product,
      tipster,
    };
  }

  /**
   * Create order and simulate payment in one step (for testing)
   */
  async createAndSimulatePayment(data: {
    productId: string;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    telegramUsername?: string;
  }) {
    // 1. Get product
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado o no está disponible');
    }

    // 2. Create order
    const orderId = await this.createPendingOrder({
      productId: data.productId,
      tipsterId: product.tipsterId,
      amountCents: product.priceCents,
      currency: product.currency,
      email: data.email,
      phone: data.phone,
      telegramUserId: data.telegramUserId,
      telegramUsername: data.telegramUsername,
      isGuest: true,
    });

    this.logger.log(`Created test order ${orderId}`);

    // 3. Simulate payment
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [
        {
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              status: 'PAGADA',
              payment_provider: 'test_simulated',
              payment_method: 'test',
              paid_at: { $date: new Date().toISOString() },
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    this.logger.log(`Simulated payment for order ${orderId}`);

    // Calculate commissions for proper net amount
    const commissions = await this.calculateOrderCommissions(
      product.tipsterId,
      product.priceCents,
      'test_simulated',
    );

    // 4. Send Telegram notification to BUYER if user came from Telegram
    let telegramResult = null;
    if (data.telegramUserId) {
      telegramResult = await this.telegramService.notifyPaymentSuccess(
        data.telegramUserId,
        orderId,
        data.productId,
      );
    }

    // 5. Notify TIPSTER about new sale with net amount
    await this.telegramService.notifyTipsterNewSale(
      product.tipsterId,
      orderId,
      data.productId,
      product.priceCents,
      product.currency,
      data.email,
      data.telegramUsername,
      commissions.netAmountCents, // Pass net amount
    );

    // 6. Get tipster info for emails
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    });

    // =============================================
    // SEND EMAILS (Test Purchase)
    // =============================================

    // Email de confirmación de compra al cliente
    if (data.email) {
      try {
        await this.emailService.sendPurchaseConfirmation({
          email: data.email,
          productName: product.title,
          tipsterName: tipster?.publicName || 'Tipster',
          billingType: (product.billingType as 'ONE_TIME' | 'SUBSCRIPTION') || 'ONE_TIME',
          billingPeriod: product.billingPeriod,
          amount: product.priceCents,
          currency: product.currency,
          orderId: orderId,
          purchaseDate: new Date(),
        });
        this.logger.log(`📧 Purchase confirmation email sent to ${data.email}`);

        // Email de acceso al canal (si tiene canal)
        if (product.telegramChannelId) {
          const channelResult = (await this.prisma.$runCommandRaw({
            find: 'telegram_channels',
            filter: { channel_id: product.telegramChannelId, is_active: true },
            projection: { invite_link: 1, channel_title: 1 },
            limit: 1,
          })) as any;
          const channel = channelResult.cursor?.firstBatch?.[0];

          if (channel?.invite_link) {
            await this.emailService.sendChannelAccess({
              email: data.email,
              productName: product.title,
              channelName: channel.channel_title || 'Canal Premium',
              telegramLink: channel.invite_link,
              orderId: orderId,
            });
            this.logger.log(`📧 Channel access email sent to ${data.email}`);
          }
        }
      } catch (emailError) {
        this.logger.error('Failed to send emails:', emailError.message);
      }
    }

    // Email y notificación al tipster sobre la venta
    if (tipster) {
      try {
        const tipsterUser = await this.prisma.user.findUnique({
          where: { id: tipster.userId },
        });

        if (tipsterUser?.email) {
          // Calcular comisiones para mostrar neto
          const commissions = await this.calculateOrderCommissions(
            product.tipsterId,
            product.priceCents,
            'test_simulated',
          );

          await this.notificationsService.notifyNewSale({
            tipsterId: tipster.id,
            tipsterUserId: tipster.userId,
            tipsterEmail: tipsterUser.email,
            productName: product.title,
            billingType: (product.billingType as 'ONE_TIME' | 'SUBSCRIPTION') || 'ONE_TIME',
            netAmount: commissions.netAmountCents,
            currency: product.currency,
            orderId: orderId,
          });
          this.logger.log(`📧 Sale notification sent to tipster ${tipsterUser.email}`);
        }
      } catch (emailError) {
        this.logger.error('Failed to send tipster notification:', emailError.message);
      }
    }

    // 7. Get order details
    const order = await this.getOrderById(orderId);

    return {
      success: true,
      message: 'Pago simulado exitosamente',
      orderId,
      order,
      product: {
        id: product.id,
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency,
      },
      tipster: tipster
        ? {
            id: tipster.id,
            publicName: tipster.publicName,
          }
        : null,
      telegramNotification: telegramResult,
    };
  }

  /**
   * Calculate commissions for an order using CommissionsService
   * Uses tipster's custom commission config if set by admin
   */
  private async calculateOrderCommissions(
    tipsterId: string,
    amountCents: number,
    paymentProvider: string,
  ): Promise<{
    grossAmountCents: number;
    gatewayFeeCents: number;
    gatewayFeePercent: number;
    platformFeeCents: number;
    platformFeePercent: number;
    netAmountCents: number;
    tier: string;
  }> {
    // Use CommissionsService for calculations (includes custom configs)
    return this.commissionsService.calculateCommissions(tipsterId, amountCents, paymentProvider);
  }

  /**
   * CENTRALIZED METHOD: Send all post-payment emails
   * Call this after ANY successful payment confirmation
   */
  private async sendPostPaymentEmails(orderId: string): Promise<void> {
    try {
      this.logger.log(`📧 Sending post-payment emails for order ${orderId}`);

      // Get order details
      const order = await this.getOrderById(orderId);
      if (!order) {
        this.logger.error(`Order ${orderId} not found for sending emails`);
        return;
      }

      // Get product
      const product = await this.prisma.product.findUnique({
        where: { id: order.productId },
      });

      // Get tipster
      const tipster = product
        ? await this.prisma.tipsterProfile.findUnique({
            where: { id: product.tipsterId },
          })
        : null;

      // Get tipster user for email
      const tipsterUser = tipster
        ? await this.prisma.user.findUnique({
            where: { id: tipster.userId },
          })
        : null;

      // =============================================
      // 1. EMAIL TO CLIENT - Purchase Confirmation
      // =============================================
      if (order.emailBackup) {
        try {
          await this.emailService.sendPurchaseConfirmation({
            email: order.emailBackup,
            productName: product?.title || 'Producto',
            tipsterName: tipster?.publicName || 'Tipster',
            billingType: (product?.billingType as 'ONE_TIME' | 'SUBSCRIPTION') || 'ONE_TIME',
            billingPeriod: product?.billingPeriod,
            amount: order.amountCents || 0,
            currency: order.currency || 'EUR',
            orderId: orderId,
            purchaseDate: new Date(),
          });
          this.logger.log(`📧 Purchase confirmation sent to ${order.emailBackup}`);
        } catch (err) {
          this.logger.error(`Failed to send purchase confirmation: ${err.message}`);
        }

        // 2. EMAIL TO CLIENT - Channel Access (ALWAYS send for any product)
        // Send access email with bot link as primary method (more reliable than direct invite links)
        try {
          // Build the bot link with order ID for automatic access
          const botUsername = this.config.get('TELEGRAM_BOT_USERNAME') || 'Antiabetbot';
          const appUrl = this.config.get('APP_URL');
          const botLink = `https://t.me/${botUsername}?start=order_${orderId}`;

          // Try to get channel info if available
          let channelName = 'Canal Premium';
          let directInviteLink: string | null = null;

          if (product?.telegramChannelId) {
            const channelResult = (await this.prisma.$runCommandRaw({
              find: 'telegram_channels',
              filter: { channel_id: product.telegramChannelId, is_active: true },
              projection: { invite_link: 1, channel_title: 1 },
              limit: 1,
            })) as any;
            const channel = channelResult.cursor?.firstBatch?.[0];
            if (channel) {
              channelName = channel.channel_title || 'Canal Premium';
              directInviteLink = channel.invite_link || null;
            }
          }

          // Always send email with bot link (works even if Telegram API is down)
          await this.emailService.sendChannelAccess({
            email: order.emailBackup,
            productName: product?.title || 'Producto',
            channelName: channelName,
            telegramLink: botLink, // Primary: bot link with order
            orderId: orderId,
          });
          this.logger.log(
            `📧 Channel access email sent to ${order.emailBackup} (bot link: ${botLink})`,
          );
        } catch (err) {
          this.logger.error(`Failed to send channel access email: ${err.message}`);
        }
      }

      // =============================================
      // 3. EMAIL + NOTIFICATION TO TIPSTER - New Sale
      // =============================================
      if (tipster && tipsterUser?.email) {
        try {
          // Calculate commissions for net amount
          const commissions = await this.calculateOrderCommissions(
            tipster.id,
            order.amountCents || 0,
            order.paymentProvider || 'stripe',
          );

          await this.notificationsService.notifyNewSale({
            tipsterId: tipster.id,
            tipsterUserId: tipster.userId,
            tipsterEmail: tipsterUser.email,
            productName: product?.title || 'Producto',
            billingType: (product?.billingType as 'ONE_TIME' | 'SUBSCRIPTION') || 'ONE_TIME',
            netAmount: commissions.netAmountCents,
            currency: order.currency || 'EUR',
            orderId: orderId,
          });
          this.logger.log(`📧 Sale notification sent to tipster ${tipsterUser.email}`);
        } catch (err) {
          this.logger.error(`Failed to send tipster notification: ${err.message}`);
        }
      }

      this.logger.log(`✅ Post-payment emails completed for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Error in sendPostPaymentEmails: ${error.message}`);
    }
  }
}
