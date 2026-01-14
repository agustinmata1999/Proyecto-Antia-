import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TelegramHttpService } from './telegram-http.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(TelegramService.name);
  private isInitialized = false;
  private httpService: TelegramHttpService;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Create HTTP service for proxy-based API calls
    this.httpService = new TelegramHttpService(config);

    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not configured - Telegram features disabled');
      return;
    }
    try {
      this.bot = new Telegraf(token);
      this.setupBot();
      this.setupCallbackHandlers();
    } catch (error) {
      this.logger.error('Failed to create Telegram bot:', error);
      this.bot = null;
    }
  }

  async onModuleInit() {
    // Use WEBHOOK mode only - no polling
    try {
      const botInfo = await this.httpService.getMe();
      this.logger.log(`📱 Bot info: @${botInfo.username}`);

      // Configure webhook
      const appUrl = this.config.get<string>('APP_URL');
      if (appUrl) {
        const webhookUrl = `${appUrl}/api/telegram/webhook`;
        this.logger.log(`🔗 Setting up webhook: ${webhookUrl}`);
        
        try {
          // First ensure any polling is stopped
          if (this.bot) {
            try {
              this.bot.stop('Switching to webhook mode');
            } catch (e) {
              // Ignore if not running
            }
          }
          
          await this.httpService.setWebhook(webhookUrl, {
            allowedUpdates: [
              'message',
              'callback_query',
              'my_chat_member',
              'chat_join_request',
              'channel_post',
            ],
            dropPendingUpdates: false,
          });
          this.logger.log('✅ Webhook configured successfully');
          
          // Start a timer to check webhook status every 30 seconds
          this.startWebhookMonitor(webhookUrl);
          
        } catch (webhookError) {
          this.logger.error(`Webhook setup failed: ${webhookError.message}`);
        }
      } else {
        this.logger.warn('APP_URL not configured');
      }

      this.isInitialized = true;
      this.logger.log('✅ TelegramService initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram:', error.message);
      this.logger.warn('⚠️  Telegram features may not work correctly');
    }
  }
  
  private webhookMonitorInterval: NodeJS.Timeout | null = null;
  
  private startWebhookMonitor(expectedUrl: string) {
    // Clear any existing monitor
    if (this.webhookMonitorInterval) {
      clearInterval(this.webhookMonitorInterval);
    }
    
    // Check webhook every 30 seconds
    this.webhookMonitorInterval = setInterval(async () => {
      try {
        const info = await this.httpService.getWebhookInfo();
        if (!info?.url || info.url !== expectedUrl) {
          this.logger.warn(`⚠️ Webhook missing or wrong, reconfiguring...`);
          await this.httpService.setWebhook(expectedUrl, {
            allowedUpdates: ['message', 'callback_query', 'my_chat_member', 'chat_join_request', 'channel_post'],
            dropPendingUpdates: false,
          });
          this.logger.log('✅ Webhook restored');
        }
      } catch (error) {
        this.logger.error('Webhook monitor error:', error.message);
      }
    }, 30000); // Every 30 seconds
  }

  private async startPollingMode() {
    if (this.bot) {
      this.logger.log('🔄 Removing webhook to enable polling mode...');
      await this.httpService.deleteWebhook();
      
      this.logger.log('🚀 Starting Telegram bot in POLLING mode...');
      this.bot
        .launch({
          dropPendingUpdates: false,
          allowedUpdates: [
            'message',
            'callback_query',
            'my_chat_member',
            'chat_join_request',
            'channel_post',
          ],
        })
        .then(() => {
          this.logger.log('✅ Telegram bot started successfully in POLLING mode');
        })
        .catch((err) => {
          this.logger.error('Failed to start bot polling:', err.message);
        });
    }
  }

  async onModuleDestroy() {
    if (this.bot && this.isInitialized) {
      // Always stop bot on shutdown (polling mode)
      this.logger.log('🛑 Stopping Telegram bot...');
      try {
        this.bot.stop('App shutdown');
        this.logger.log('✅ Telegram bot stopped');
      } catch (error) {
        this.logger.warn('Error stopping bot:', error.message);
      }
    }
  }

  /**
   * Get the current status of the Telegram bot
   */
  async getBotStatus(): Promise<{
    initialized: boolean;
    botUsername: string | null;
    webhookUrl: string | null;
    webhookConfigured: boolean;
    pollingMode: boolean;
    lastError: string | null;
  }> {
    try {
      // Test connection via proxy
      const botInfo = await this.httpService.getMe();
      const webhookInfo = await this.httpService.getWebhookInfo();

      return {
        initialized: this.isInitialized,
        botUsername: botInfo?.username || null,
        webhookUrl: webhookInfo?.url || null,
        webhookConfigured: !!webhookInfo?.url,
        pollingMode: false,
        lastError: null,
      };
    } catch (error) {
      return {
        initialized: this.isInitialized,
        botUsername: null,
        webhookUrl: null,
        webhookConfigured: false,
        pollingMode: false,
        lastError: error.message,
      };
    }
  }

  /**
   * Force setup webhook (for debugging/fixing issues)
   */
  async forceSetupWebhook(): Promise<{ success: boolean; webhookUrl: string; message: string }> {
    try {
      const appUrl = this.config.get<string>('APP_URL');
      if (!appUrl) {
        return { success: false, webhookUrl: '', message: 'APP_URL not configured' };
      }

      const webhookUrl = `${appUrl}/api/telegram/webhook`;
      
      // First delete any existing webhook
      await this.httpService.deleteWebhook(false);
      
      // Set new webhook
      await this.httpService.setWebhook(webhookUrl, {
        allowedUpdates: ['message', 'callback_query', 'my_chat_member', 'chat_join_request', 'channel_post'],
        dropPendingUpdates: false,
      });

      this.logger.log(`✅ Webhook forced: ${webhookUrl}`);
      return { success: true, webhookUrl, message: 'Webhook configured successfully' };
    } catch (error) {
      this.logger.error('Error forcing webhook:', error);
      return { success: false, webhookUrl: '', message: error.message };
    }
  }

  private setupBot() {
    if (!this.bot) return;

    // Handler cuando el bot es añadido a un canal
    this.bot.on('my_chat_member', async (ctx) => {
      try {
        const { chat, new_chat_member, old_chat_member, from } = ctx.myChatMember;
        const chatTitle = 'title' in chat ? chat.title : 'N/A';
        const addedByUserId = from?.id?.toString() || null;
        const addedByUsername = from?.username || null;
        
        this.logger.log(
          `📥 my_chat_member event: ${chatTitle} (${chat.id}) - status: ${new_chat_member.status} - from: ${addedByUserId}`,
        );

        // Verificar si el bot fue añadido como administrador
        if (
          new_chat_member.status === 'administrator' &&
          (chat.type === 'channel' || chat.type === 'supergroup')
        ) {
          this.logger.log(`🎉 Bot added to channel: ${chat.title} (${chat.id}) by user: ${addedByUserId}`);

          // Guardar en la tabla de canales detectados CON el ID del usuario que añadió el bot
          await this.saveDetectedChannel(
            chat.id.toString(), 
            chat.title, 
            chat.username, 
            chat.type,
            addedByUserId,
            addedByUsername
          );

          // Intentar auto-conectar el canal si el usuario ya está vinculado
          await this.tryAutoConnectChannel(chat.id.toString(), chat.title, chat.username, addedByUserId);

          // Legacy: manejar conexión automática para tipsters pendientes
          await this.handleChannelConnection(chat.id.toString(), chat.title, chat.username);
        }

        // Si el bot fue removido del canal, marcar como inactivo
        if (
          (old_chat_member?.status === 'administrator' || old_chat_member?.status === 'creator') &&
          (new_chat_member.status === 'left' || new_chat_member.status === 'kicked') &&
          (chat.type === 'channel' || chat.type === 'supergroup')
        ) {
          this.logger.log(`👋 Bot removed from channel: ${chat.title} (${chat.id})`);
          await this.markChannelAsInactive(chat.id.toString());
          // También marcar los canales conectados como desconectados
          await this.markConnectedChannelAsDisconnected(chat.id.toString());
        }
      } catch (error) {
        this.logger.error('Error handling my_chat_member:', error);
      }
    });

    // Handler para CUALQUIER mensaje en canales - auto-registrar el canal
    this.bot.on('channel_post', async (ctx) => {
      try {
        const chat = ctx.chat;
        if (chat.type === 'channel') {
          this.logger.log(`📬 Channel post received in: ${chat.title} (${chat.id})`);
          // Auto-registrar el canal si el bot puede ver mensajes (es admin)
          await this.saveDetectedChannel(chat.id.toString(), chat.title, chat.username, chat.type);
          
          // Guardar mensaje si el canal está siendo monitoreado
          await this.saveMonitoredMessage(ctx.channelPost, chat);
        }
      } catch (error) {
        // Silently ignore errors
        this.logger.warn(`Error handling channel_post: ${error.message}`);
      }
    });

    // Handler para mensajes en grupos/supergrupos (monitoreo)
    this.bot.on('message', async (ctx) => {
      try {
        const chat = ctx.chat;
        const message = ctx.message;
        
        // Solo procesar mensajes de grupos
        if (chat.type === 'supergroup' || chat.type === 'group') {
          // Guardar mensaje si el grupo está siendo monitoreado
          await this.saveMonitoredMessage(message, chat);
        }
      } catch (error) {
        // Silently ignore errors to not disrupt other handlers
        this.logger.warn(`Error handling group message: ${error.message}`);
      }
    });

    // Handler para solicitudes de unión a canales/grupos
    this.bot.on('chat_join_request', async (ctx) => {
      try {
        await this.handleJoinRequest(ctx);
      } catch (error) {
        this.logger.error('Error handling chat_join_request:', error);
      }
    });

    // Command /start - FLUJO SIMPLIFICADO POST-PAGO
    this.bot.command('start', async (ctx) => {
      try {
        this.logger.log('📥 Received /start command from user: ' + ctx.from?.id);
        const startPayload = ctx.message.text.split(' ')[1];
        this.logger.log(`📦 Start payload: ${startPayload || 'NONE'}`);
        const telegramUserId = ctx.from.id.toString();

        // Helper to send messages via proxy
        const replyViaProxy = async (text: string, options: any = {}) => {
          try {
            await this.httpService.sendMessage(telegramUserId, text, {
              parseMode: options.parse_mode || 'Markdown',
              replyMarkup: options.reply_markup,
            });
          } catch (err) {
            this.logger.error('Failed to send via proxy:', err.message);
            // Fallback to direct (might fail but try anyway)
            try {
              await ctx.reply(text, options);
            } catch (e) {
              this.logger.error('Direct reply also failed:', e.message);
            }
          }
        };

        // NUEVO FLUJO: Si viene con order_, validar pago y dar acceso
        if (startPayload && startPayload.startsWith('order_')) {
          const orderId = startPayload.replace('order_', '');
          this.logger.log(`🎯 Post-payment flow for order: ${orderId}`);
          await this.handlePostPaymentAccessViaProxy(orderId, telegramUserId);
          return;
        }

        // LEGACY: Si viene con product_, redirigir al checkout web
        if (startPayload && startPayload.startsWith('product_')) {
          const productId = startPayload.replace('product_', '');
          this.logger.log(`🔄 Redirecting to web checkout for product: ${productId}`);

          const appUrl = this.config.get('APP_URL');
          const checkoutUrl = `${appUrl}/checkout/${productId}`;

          await replyViaProxy(
            '👋 ¡Bienvenido a Antia!\n\n' +
              '💳 Para completar tu compra, haz clic en el botón de abajo:\n\n' +
              '_Serás redirigido a nuestra página de pago seguro._',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: '💳 Ir al Checkout', url: checkoutUrl }]],
              },
            },
          );
          return;
        }

        // Sin payload válido - mensaje de bienvenida simple
        await replyViaProxy(
          '👋 ¡Bienvenido a Antia!\n\n' +
            '🛒 *¿Cómo comprar?*\n\n' +
            '1️⃣ Busca el producto que te interesa en el canal del tipster\n' +
            '2️⃣ Haz clic en el enlace de compra\n' +
            '3️⃣ Completa el pago en nuestra web\n' +
            '4️⃣ Vuelve aquí automáticamente para recibir tu acceso\n\n' +
            '✅ *¿Ya pagaste?*\n' +
            'Si ya realizaste una compra, deberías haber sido redirigido aquí automáticamente con tu acceso.\n\n' +
            '❓ *¿Necesitas ayuda?*\n' +
            'Contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
      } catch (error) {
        this.logger.error('Error in /start command:', error);
        try {
          await this.httpService.sendMessage(
            ctx.from.id.toString(),
            'Hubo un error. Por favor, intenta nuevamente.',
          );
        } catch (e) {
          // Silently fail
        }
      }
    });

    // Command /info para obtener información del chat (útil para tipsters)
    this.bot.command('info', async (ctx) => {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const chatTitle = 'title' in ctx.chat ? ctx.chat.title : 'N/A';
      const chatUsername = 'username' in ctx.chat ? ctx.chat.username : 'N/A';

      await ctx.reply(
        `
📊 **Información del Chat**

🆔 Chat ID: \`${chatId}\`
📝 Tipo: ${chatType}
🏷️ Título: ${chatTitle}
👤 Username: @${chatUsername}
      `,
        { parse_mode: 'Markdown' },
      );
    });

    // Comando /vincular - Vincular cuenta de Telegram al perfil de tipster
    // Este es el handler de Telegraf (fallback si el webhook no funciona)
    this.bot.command('vincular', async (ctx) => {
      try {
        const telegramUserId = ctx.from.id.toString();
        const telegramUsername = ctx.from.username || null;
        const firstName = ctx.from.first_name || '';
        const lastName = ctx.from.last_name || '';

        this.logger.log(`📱 /vincular command (Telegraf) from user: ${telegramUserId} (@${telegramUsername})`);

        // Generar código de vinculación único
        const linkCode = this.generateLinkCode(telegramUserId);
        
        // Guardar el código en la base de datos
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

        await this.prisma.$runCommandRaw({
          update: 'telegram_link_codes',
          updates: [
            {
              q: { telegram_user_id: telegramUserId },
              u: {
                $set: {
                  telegram_user_id: telegramUserId,
                  telegram_username: telegramUsername,
                  first_name: firstName,
                  last_name: lastName,
                  link_code: linkCode,
                  context: 'aprobado', // Comando manual es para tipsters aprobados
                  created_at: { $date: now },
                  expires_at: { $date: expiresAt },
                  used: false,
                },
              },
              upsert: true,
            },
          ],
        });

        // Obtener URL de la plataforma
        const appUrl = this.config.get<string>('APP_URL') || 'https://antia.com';
        const linkUrl = `${appUrl}/connect-telegram?code=${linkCode}`;

        await ctx.reply(
          '🔗 *Vincular tu cuenta de Telegram*\n\n' +
            'Tienes dos opciones para vincular tu cuenta:\n\n' +
            '*Opción 1 - Código de vinculación:*\n' +
            `Tu código es: \`${linkCode}\`\n` +
            'Cópialo e ingrésalo en la plataforma.\n\n' +
            '*Opción 2 - Link directo:*\n' +
            'Haz clic en el botón de abajo para vincular y acceder a la plataforma.\n\n' +
            '⏰ El código expira en 10 minutos.\n\n' +
            'Una vez vinculado, todos los canales donde añadas el bot como admin se conectarán automáticamente.',
          { 
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
            reply_markup: {
              inline_keyboard: [[{ text: '🚀 Vincular y Acceder', url: linkUrl }]],
            },
          },
        );

        this.logger.log(`✅ Link code generated for ${telegramUserId}: ${linkCode}`);
      } catch (error) {
        this.logger.error('Error handling /vincular command:', error);
        await ctx.reply(
          '❌ Error al generar el código de vinculación.\n' +
            'Por favor, intenta de nuevo más tarde.',
        );
      }
    });

    // Handler para mensajes de texto - ya no procesa compras, solo ayuda
    this.bot.on('text', async (ctx) => {
      try {
        if (ctx.message.text.startsWith('/')) {
          return;
        }

        // Mensaje simple de ayuda
        await ctx.reply(
          '👋 ¡Hola! Soy el bot de Antia.\n\n' +
            '🛒 Para comprar un producto:\n' +
            '1️⃣ Busca el enlace de compra en el canal del tipster\n' +
            '2️⃣ Haz clic para ir al checkout\n' +
            '3️⃣ Completa el pago\n' +
            '4️⃣ Volverás aquí para recibir tu acceso\n\n' +
            '❓ ¿Necesitas ayuda? Contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
      } catch (error) {
        this.logger.error('Error processing text message:', error);
      }
    });
  }

  /**
   * NUEVO: Manejar acceso post-pago
   * Valida que el pago existe y está completado, luego da acceso al canal
   */
  private async handlePostPaymentAccess(ctx: any, orderId: string, telegramUserId: string) {
    try {
      this.logger.log(`🔍 Validating payment for order ${orderId}, user ${telegramUserId}`);

      // Validar formato del orderId
      if (!orderId || orderId.length < 10) {
        this.logger.error(`❌ Invalid orderId format: ${orderId}`);
        await ctx.reply(
          '❌ *Error en el enlace*\n\n' +
            'El enlace de acceso parece estar incompleto.\n' +
            'Por favor, usa el enlace original que recibiste.\n\n' +
            'Si el problema persiste, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Función para buscar la orden
      const findOrder = async () => {
        try {
          const orderResult = (await this.prisma.$runCommandRaw({
            find: 'orders',
            filter: { _id: { $oid: orderId } },
            limit: 1,
          })) as any;
          return orderResult.cursor?.firstBatch?.[0];
        } catch (err) {
          this.logger.error(`Error finding order ${orderId}: ${err.message}`);
          return null;
        }
      };

      // Buscar la orden con reintentos más agresivos
      let order = await findOrder();
      let retries = 0;
      const maxRetries = 5; // Aumentado de 3 a 5
      const retryDelay = 2000; // 2 segundos

      // Reintentar si la orden no existe O si está PENDING
      while ((!order || order.status === 'PENDING') && retries < maxRetries) {
        const reason = !order ? 'not found' : 'PENDING';
        this.logger.log(
          `⏳ Order ${orderId} ${reason}, waiting ${retryDelay}ms (retry ${retries + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        order = await findOrder();
        retries++;
      }

      if (!order) {
        this.logger.warn(`❌ Order ${orderId} not found after ${retries} retries`);
        await ctx.reply(
          '❌ *Orden no encontrada*\n\n' +
            'No pudimos encontrar tu compra. Esto puede ocurrir si:\n' +
            '• El pago aún se está procesando (espera 1-2 min)\n' +
            '• Hubo un problema con la transacción\n\n' +
            '💡 *Solución:* Vuelve a hacer clic en el enlace del bot que te apareció después del pago.\n\n' +
            'Si después de 5 minutos sigue sin funcionar, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Verificar que el pago está completado
      if (order.status !== 'PAGADA' && order.status !== 'COMPLETED' && order.status !== 'paid') {
        this.logger.warn(
          `❌ Order ${orderId} not paid after ${retries} retries. Status: ${order.status}`,
        );
        await ctx.reply(
          '⏳ *Pago en proceso*\n\n' +
            'Tu pago está siendo procesado. Por favor:\n\n' +
            '1️⃣ Espera 1-2 minutos\n' +
            '2️⃣ Vuelve a hacer clic en el enlace del bot\n\n' +
            'Si después de 5 minutos no recibes acceso, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      this.logger.log(`✅ Order ${orderId} is paid (status: ${order.status})`);

      // Actualizar la orden con el telegramUserId del cliente
      await this.prisma.$runCommandRaw({
        update: 'orders',
        updates: [
          {
            q: { _id: { $oid: orderId } },
            u: {
              $set: {
                telegram_user_id: telegramUserId,
                updated_at: { $date: new Date().toISOString() },
              },
            },
          },
        ],
      });

      // Obtener producto - intentar por id y también con $oid
      let product: any = null;
      const productId = order.product_id;

      this.logger.log(`🔍 Looking for product: ${productId}`);

      // Primero intentar con Prisma normal
      try {
        product = await this.prisma.product.findUnique({
          where: { id: productId },
        });
      } catch (e) {
        this.logger.warn(`Prisma findUnique failed for product ${productId}: ${e.message}`);
      }

      // Si no lo encuentra, intentar con $runCommandRaw
      if (!product) {
        this.logger.log(`Trying raw query for product ${productId}`);
        try {
          const productResult = (await this.prisma.$runCommandRaw({
            find: 'products',
            filter: { _id: { $oid: productId } },
            limit: 1,
          })) as any;
          const rawProduct = productResult.cursor?.firstBatch?.[0];
          if (rawProduct) {
            product = {
              id: rawProduct._id?.$oid || productId,
              title: rawProduct.title,
              description: rawProduct.description,
              priceCents: rawProduct.price_cents,
              tipsterId: rawProduct.tipster_id,
              telegramChannelId: rawProduct.telegram_channel_id,
              billingType: rawProduct.billing_type,
            };
            this.logger.log(`✅ Found product via raw query: ${product.title}`);
          }
        } catch (e) {
          this.logger.error(`Raw query also failed for product ${productId}: ${e.message}`);
        }
      }

      if (!product) {
        this.logger.error(`❌ Product ${productId} not found by any method`);
        await ctx.reply(
          '❌ *Error al procesar tu compra*\n\n' +
            'No pudimos encontrar el producto asociado a tu compra.\n\n' +
            'Por favor, contacta con @AntiaSupport con este código:\n' +
            `\`ORDER: ${orderId}\``,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      this.logger.log(`✅ Product found: ${product.title} (tipsterId: ${product.tipsterId})`);

      // Obtener tipster
      let tipster: any = null;
      try {
        tipster = await this.prisma.tipsterProfile.findUnique({
          where: { id: product.tipsterId },
        });
      } catch (e) {
        this.logger.warn(`Could not find tipster profile: ${e.message}`);
      }

      // Si no encuentra por Prisma, intentar raw query
      if (!tipster && product.tipsterId) {
        try {
          const tipsterResult = (await this.prisma.$runCommandRaw({
            find: 'tipster_profiles',
            filter: { _id: { $oid: product.tipsterId } },
            limit: 1,
          })) as any;
          const rawTipster = tipsterResult.cursor?.firstBatch?.[0];
          if (rawTipster) {
            tipster = {
              id: rawTipster._id?.$oid || product.tipsterId,
              publicName: rawTipster.public_name,
              premiumChannelLink: rawTipster.premium_channel_link,
            };
            this.logger.log(`✅ Found tipster via raw query: ${tipster.publicName}`);
          }
        } catch (e) {
          this.logger.error(`Could not find tipster by raw query: ${e.message}`);
        }
      }

      // Buscar el canal asociado al producto
      let channelLink: string | null = null;
      let channelTitle: string = product.title;
      let channelId: string | null = null;

      if (product.telegramChannelId) {
        this.logger.log(
          `🔍 Looking for channel: ${product.telegramChannelId} for tipster: ${tipster?.id || 'unknown'}`,
        );

        // Buscar canal - primero con tipster_id, luego sin él como fallback
        let channelResult = (await this.prisma.$runCommandRaw({
          find: 'telegram_channels',
          filter: {
            channel_id: product.telegramChannelId,
            ...(tipster?.id ? { tipster_id: tipster.id } : {}),
            is_active: true,
          },
          projection: { invite_link: 1, channel_title: 1, channel_id: 1, _id: 1, tipster_id: 1 },
          limit: 1,
        })) as any;

        let channel = channelResult.cursor?.firstBatch?.[0];

        // Si no encontró con tipster_id, buscar solo por channel_id
        if (!channel) {
          this.logger.log(`⚠️ Channel not found with tipster filter, trying without...`);
          channelResult = (await this.prisma.$runCommandRaw({
            find: 'telegram_channels',
            filter: {
              channel_id: product.telegramChannelId,
              is_active: true,
            },
            projection: { invite_link: 1, channel_title: 1, channel_id: 1, _id: 1, tipster_id: 1 },
            limit: 1,
          })) as any;
          channel = channelResult.cursor?.firstBatch?.[0];
        }

        if (channel) {
          channelLink = channel.invite_link;
          channelTitle = channel.channel_title || product.title;
          channelId = channel.channel_id;
          this.logger.log(
            `✅ Found channel: ${channelTitle} (ID: ${channelId}, saved link: ${channelLink ? 'YES' : 'NO'})`,
          );

          // SIEMPRE generar un link con JOIN REQUEST para validación
          if (channelId) {
            this.logger.log(`🔄 Generating join request link for channel ${channelId}...`);
            try {
              // Crear link de invitación que REQUIERE APROBACIÓN
              const inviteResult = await this.bot.telegram.createChatInviteLink(channelId, {
                creates_join_request: true,  // ← REQUIERE APROBACIÓN DEL BOT
                name: `JoinReq-${Date.now()}`, // Nombre único para tracking
              });
              channelLink = inviteResult.invite_link;
              this.logger.log(`✅ Created join request link: ${channelLink}`);

              // Actualizar el link en la base de datos
              const channelOid = channel._id?.$oid || channel._id;
              if (channelOid) {
                await this.prisma.$runCommandRaw({
                  update: 'telegram_channels',
                  updates: [
                    {
                      q: { _id: { $oid: channelOid } },
                      u: {
                        $set: {
                          invite_link: channelLink,
                          updated_at: { $date: new Date().toISOString() },
                        },
                      },
                    },
                  ],
                });
                this.logger.log(`✅ Updated invite link in database`);
              }
            } catch (e) {
              this.logger.error(`Failed to create join request link: ${e.message}`);
              // Si falla, intentar crear link normal como fallback
              try {
                const fallbackLink = await this.bot.telegram.createChatInviteLink(channelId, {
                  creates_join_request: true,
                });
                channelLink = fallbackLink.invite_link;
                this.logger.log(`✅ Created fallback join request link: ${channelLink}`);
              } catch (e2) {
                this.logger.error(`Also failed to create fallback link: ${e2.message}`);
                // Usar el link guardado como último recurso
                if (channel.invite_link) {
                  channelLink = channel.invite_link;
                  this.logger.warn(`⚠️ Using saved invite link as fallback`);
                }
              }
            }
          }
        } else {
          this.logger.warn(`❌ Channel ${product.telegramChannelId} not found in database`);
        }
      } else {
        this.logger.log(`ℹ️ Product has no telegramChannelId - this is a "no channel" product`);
      }

      // Si no hay canal del producto, buscar legacy premium_channel_link
      if (!channelLink && tipster) {
        const tipsterResult = (await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { _id: { $oid: tipster.id } },
          projection: { premium_channel_link: 1 },
          limit: 1,
        })) as any;
        channelLink = tipsterResult.cursor?.firstBatch?.[0]?.premium_channel_link;
        if (channelLink) {
          this.logger.log(`✅ Using legacy premium_channel_link: ${channelLink}`);
        }
      }

      // Mensaje de confirmación
      await ctx.reply(
        `✅ *¡Pago verificado!*\n\n` +
          `Gracias por tu compra de *${product.title}*.\n\n` +
          `Tu acceso está listo.`,
        { parse_mode: 'Markdown' },
      );

      // Mostrar acceso al canal con instrucciones del nuevo flujo
      if (channelLink) {
        await ctx.reply(
          `🎯 *Acceso a tu canal premium*\n\n` +
            `Para unirte a *${channelTitle}*:\n\n` +
            `1️⃣ Haz clic en el botón de abajo\n` +
            `2️⃣ Pulsa *"Solicitar unirme"*\n` +
            `3️⃣ Tu solicitud será *aprobada automáticamente* ✅\n\n` +
            `_El sistema verificará tu compra y te dará acceso al instante._`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: `🚀 Solicitar acceso a ${channelTitle}`, url: channelLink }]],
            },
          },
        );

        // Guardar registro de acceso otorgado
        await this.prisma.$runCommandRaw({
          update: 'orders',
          updates: [
            {
              q: { _id: { $oid: orderId } },
              u: {
                $set: {
                  access_granted: false, // Ahora es false hasta que se apruebe la solicitud
                  access_link_sent: true,
                  access_granted_at: { $date: new Date().toISOString() },
                  channel_link_sent: channelLink,
                },
              },
            },
          ],
        });

        this.logger.log(`✅ Join request link sent to user ${telegramUserId} for order ${orderId}`);
      } else {
        // Verificar si el producto intencionalmente no tiene canal
        if (!product.telegramChannelId) {
          // Producto sin canal - Solo confirmación
          await ctx.reply(
            `✅ *¡Compra completada!*\n\n` +
              `Tu compra de *${product.title}* ha sido procesada correctamente.\n\n` +
              `📧 Recibirás información adicional en tu correo electrónico.\n\n` +
              `Si tienes alguna duda, contacta con @AntiaSupport`,
            { parse_mode: 'Markdown' },
          );
        } else {
          // Producto con canal pero no se encontró el link
          await ctx.reply(
            `ℹ️ *Acceso pendiente*\n\n` +
              `El tipster *${tipster?.publicName || 'desconocido'}* te contactará pronto con los detalles de acceso.\n\n` +
              `Si no recibes noticias en 24h, contacta con @AntiaSupport`,
            { parse_mode: 'Markdown' },
          );
        }
      }

      // REMOVED: Tipster notification is already sent from checkout.service.ts
      // Keeping it here would cause DUPLICATE notifications
      // if (tipster) {
      //   await this.notifyTipsterNewSale(...);
      // }
    } catch (error) {
      this.logger.error('Error in handlePostPaymentAccess:', error);
      await ctx.reply(
        '❌ Hubo un error al procesar tu acceso. Por favor, intenta de nuevo o contacta con @AntiaSupport',
      );
    }
  }

  /**
   * Handle post-payment access flow via proxy (bypasses firewall)
   */
  private async handlePostPaymentAccessViaProxy(orderId: string, telegramUserId: string) {
    // Helper to send messages via proxy
    const sendMessage = async (text: string, options: any = {}) => {
      try {
        await this.httpService.sendMessage(telegramUserId, text, {
          parseMode: options.parse_mode || 'Markdown',
          replyMarkup: options.reply_markup,
        });
      } catch (err) {
        this.logger.error('Failed to send via proxy:', err.message);
      }
    };

    try {
      this.logger.log(`🔍 [PROXY] Validating payment for order ${orderId}, user ${telegramUserId}`);

      // Validate orderId format
      if (!orderId || orderId.length < 10) {
        this.logger.error(`❌ Invalid orderId format: ${orderId}`);
        await sendMessage(
          '❌ *Error en el enlace*\n\n' +
            'El enlace de acceso parece estar incompleto.\n' +
            'Por favor, usa el enlace original que recibiste.\n\n' +
            'Si el problema persiste, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Find order function
      const findOrder = async () => {
        try {
          const orderResult = (await this.prisma.$runCommandRaw({
            find: 'orders',
            filter: { _id: { $oid: orderId } },
            limit: 1,
          })) as any;
          return orderResult.cursor?.firstBatch?.[0];
        } catch (err) {
          this.logger.error(`Error finding order ${orderId}: ${err.message}`);
          return null;
        }
      };

      // Find order with retries
      let order = await findOrder();
      let retries = 0;
      const maxRetries = 5;
      const retryDelay = 2000;

      while ((!order || order.status === 'PENDING') && retries < maxRetries) {
        const reason = !order ? 'not found' : 'PENDING';
        this.logger.log(
          `⏳ Order ${orderId} ${reason}, waiting ${retryDelay}ms (retry ${retries + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        order = await findOrder();
        retries++;
      }

      if (!order) {
        this.logger.warn(`❌ Order ${orderId} not found after ${retries} retries`);
        await sendMessage(
          '❌ *Orden no encontrada*\n\n' +
            'No pudimos encontrar tu compra. Esto puede ocurrir si:\n' +
            '• El pago aún se está procesando (espera 1-2 min)\n' +
            '• Hubo un problema con la transacción\n\n' +
            '💡 *Solución:* Vuelve a hacer clic en el enlace del bot.\n\n' +
            'Si después de 5 minutos sigue sin funcionar, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      // Verify payment status
      if (order.status !== 'PAGADA' && order.status !== 'COMPLETED' && order.status !== 'paid') {
        this.logger.warn(`❌ Order ${orderId} not paid. Status: ${order.status}`);
        await sendMessage(
          '⏳ *Pago en proceso*\n\n' +
            'Tu pago está siendo procesado. Por favor:\n\n' +
            '1️⃣ Espera 1-2 minutos\n' +
            '2️⃣ Vuelve a hacer clic en el enlace del bot\n\n' +
            'Si después de 5 minutos no recibes acceso, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' },
        );
        return;
      }

      this.logger.log(`✅ Order ${orderId} is paid (status: ${order.status})`);

      // Update order with telegram user ID
      await this.prisma.$runCommandRaw({
        update: 'orders',
        updates: [
          {
            q: { _id: { $oid: orderId } },
            u: {
              $set: {
                telegram_user_id: telegramUserId,
                updated_at: { $date: new Date().toISOString() },
              },
            },
          },
        ],
      });

      // Get product
      const productId = order.product_id;
      this.logger.log(`🔍 Looking for product: ${productId}`);

      let product: any = null;
      try {
        product = await this.prisma.product.findUnique({
          where: { id: productId },
        });
      } catch (e) {
        this.logger.warn(`Prisma findUnique failed: ${e.message}`);
      }

      if (!product) {
        try {
          const productResult = (await this.prisma.$runCommandRaw({
            find: 'products',
            filter: { _id: { $oid: productId } },
            limit: 1,
          })) as any;
          const rawProduct = productResult.cursor?.firstBatch?.[0];
          if (rawProduct) {
            product = {
              id: rawProduct._id?.$oid || productId,
              title: rawProduct.title,
              tipsterId: rawProduct.tipster_id,
              telegramChannelId: rawProduct.telegram_channel_id,
              priceCents: rawProduct.price_cents,
            };
          }
        } catch (e) {
          this.logger.error(`Raw query failed: ${e.message}`);
        }
      }

      if (!product) {
        this.logger.error(`❌ Product ${productId} not found`);
        await sendMessage(
          '❌ *Error al procesar tu compra*\n\n' +
            'No pudimos encontrar el producto.\n\n' +
            'Por favor, contacta con @AntiaSupport con este código:\n' +
            `\`ORDER: ${orderId}\``,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      this.logger.log(`✅ Product found: ${product.title}`);

      // Get tipster
      let tipster: any = null;
      if (product.tipsterId) {
        try {
          const tipsterResult = (await this.prisma.$runCommandRaw({
            find: 'tipster_profiles',
            filter: { _id: { $oid: product.tipsterId } },
            limit: 1,
          })) as any;
          const rawTipster = tipsterResult.cursor?.firstBatch?.[0];
          if (rawTipster) {
            tipster = {
              id: rawTipster._id?.$oid || product.tipsterId,
              publicName: rawTipster.public_name,
            };
          }
        } catch (e) {
          this.logger.error(`Could not find tipster: ${e.message}`);
        }
      }

      // Find channel for product
      let channelLink: string | null = null;
      let channelTitle: string = product.title;
      let channelId: string | null = null;

      if (product.telegramChannelId) {
        this.logger.log(`🔍 Looking for channel: ${product.telegramChannelId}`);

        const channelResult = (await this.prisma.$runCommandRaw({
          find: 'telegram_channels',
          filter: {
            channel_id: product.telegramChannelId,
            is_active: true,
          },
          projection: { invite_link: 1, channel_title: 1, channel_id: 1, _id: 1 },
          limit: 1,
        })) as any;

        const channel = channelResult.cursor?.firstBatch?.[0];

        if (channel) {
          channelTitle = channel.channel_title || product.title;
          channelId = channel.channel_id;
          this.logger.log(
            `✅ Found channel: ${channelTitle} (ID: ${channelId})`,
          );

          // SIEMPRE generar un nuevo enlace con JOIN REQUEST para cada compra
          // Esto garantiza que el enlace sea válido y funcione correctamente
          if (channelId) {
            this.logger.log(`🔄 Generating fresh join request link for channel ${channelId}...`);
            try {
              const inviteResult = await this.httpService.createChatInviteLink(channelId, {
                createsJoinRequest: true,
                name: `Purchase-${Date.now()}`,
              });
              channelLink = inviteResult.invite_link;
              this.logger.log(`✅ Created join request link via proxy: ${channelLink}`);

              // Save to database for reference
              const channelOid = channel._id?.$oid || channel._id;
              if (channelOid) {
                await this.prisma.$runCommandRaw({
                  update: 'telegram_channels',
                  updates: [
                    {
                      q: { _id: { $oid: channelOid } },
                      u: {
                        $set: {
                          invite_link: channelLink,
                          updated_at: { $date: new Date().toISOString() },
                        },
                      },
                    },
                  ],
                });
              }
            } catch (e) {
              this.logger.error(`Failed to create join request link: ${e.message}`);
              // Fallback: usar el enlace guardado si existe
              if (channel.invite_link) {
                channelLink = channel.invite_link;
                this.logger.warn(`⚠️ Using saved invite link as fallback: ${channelLink}`);
              }
            }
          }
        }
      }

      // Send confirmation message
      await sendMessage(
        `✅ *¡Pago verificado!*\n\n` +
          `Gracias por tu compra de *${product.title}*.\n\n` +
          `Tu acceso está listo.`,
        { parse_mode: 'Markdown' },
      );

      // Send channel access with join request flow
      if (channelLink) {
        await sendMessage(
          `🎯 *Acceso a tu canal premium*\n\n` +
            `Para unirte a *${channelTitle}*:\n\n` +
            `1️⃣ Haz clic en el botón de abajo\n` +
            `2️⃣ Pulsa *"Solicitar unirme"*\n` +
            `3️⃣ Tu solicitud será *aprobada automáticamente* ✅\n\n` +
            `_El sistema verificará tu compra y te dará acceso al instante._`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: `🚀 Solicitar acceso a ${channelTitle}`, url: channelLink }]],
            },
          },
        );

        // Update order with link sent (access will be granted when join request is approved)
        await this.prisma.$runCommandRaw({
          update: 'orders',
          updates: [
            {
              q: { _id: { $oid: orderId } },
              u: {
                $set: {
                  access_granted: false,
                  access_link_sent: true,
                  access_granted_at: { $date: new Date().toISOString() },
                  channel_link_sent: channelLink,
                },
              },
            },
          ],
        });

        this.logger.log(`✅ Join request link sent to user ${telegramUserId} for order ${orderId}`);
      } else {
        await sendMessage(
          `ℹ️ *Acceso pendiente*\n\n` +
            `El tipster *${tipster?.publicName || 'desconocido'}* te contactará pronto con los detalles de acceso.\n\n` +
            `Si no recibes noticias en 24h, contacta con @AntiaSupport`,
          { parse_mode: 'Markdown' },
        );
      }

      // REMOVED: Tipster notification is already sent from checkout.service.ts
      // Keeping it here would cause DUPLICATE notifications
      // if (tipster) {
      //   await this.notifyTipsterNewSale(...);
      // }
    } catch (error) {
      this.logger.error('Error in handlePostPaymentAccessViaProxy:', error);
      await sendMessage(
        '❌ Hubo un error al procesar tu acceso. Por favor, intenta de nuevo o contacta con @AntiaSupport',
      );
    }
  }

  /**
   * NUEVO: Manejar solicitudes de unión a canales
   * Aprueba automáticamente si el usuario tiene una compra válida
   */
  private async handleJoinRequest(ctx: any) {
    try {
      const { chat, from } = ctx.chatJoinRequest;
      const channelId = chat.id.toString();
      const telegramUserId = from.id.toString();
      const telegramUsername = from.username || null;
      const firstName = from.first_name || 'Usuario';

      this.logger.log(`📥 Join request from user ${telegramUserId} (@${telegramUsername}) to channel ${channelId} (${chat.title})`);

      // Buscar el canal para obtener info del producto
      const channelResult = (await this.prisma.$runCommandRaw({
        find: 'telegram_channels',
        filter: { channel_id: channelId },
        limit: 1,
      })) as any;
      const channel = channelResult.cursor?.firstBatch?.[0];

      // Buscar si el usuario tiene una orden pagada para este canal
      const orderResult = (await this.prisma.$runCommandRaw({
        find: 'orders',
        filter: {
          telegram_user_id: telegramUserId,
          status: { $in: ['PAGADA', 'COMPLETED', 'paid', 'ACCESS_GRANTED'] },
        },
        sort: { created_at: -1 },
        limit: 20,
      })) as any;

      const orders = orderResult.cursor?.firstBatch || [];
      this.logger.log(`Found ${orders.length} paid orders for user ${telegramUserId}`);

      // Verificar si alguna orden tiene acceso a este canal
      for (const order of orders) {
        // Buscar el producto de la orden
        const product: any = await this.prisma.product.findUnique({
          where: { id: order.product_id },
        });

        if (!product) {
          this.logger.warn(`Product ${order.product_id} not found for order ${order._id}`);
          continue;
        }

        // Verificar si el producto está vinculado a este canal
        const productChannelId = product.telegramChannelId || product.telegram_channel_id;
        
        this.logger.log(`Checking product ${product.id}: channelId=${productChannelId} vs requested=${channelId}`);

        if (productChannelId === channelId) {
          // Verificar si la suscripción no ha expirado (si aplica)
          if (order.subscription_end_date) {
            const endDate = new Date(order.subscription_end_date.$date || order.subscription_end_date);
            if (endDate < new Date()) {
              this.logger.warn(`Subscription expired for order ${order._id}`);
              continue; // Suscripción expirada, seguir buscando otras órdenes
            }
          }

          // ¡Usuario autorizado! Aprobar solicitud
          try {
            await this.bot.telegram.approveChatJoinRequest(channelId, parseInt(telegramUserId));
            this.logger.log(`✅ APPROVED join request for user ${telegramUserId} to channel ${channelId}`);

            // Marcar orden como con acceso otorgado
            await this.prisma.$runCommandRaw({
              update: 'orders',
              updates: [
                {
                  q: { _id: { $oid: order._id.$oid || order._id.toString() } },
                  u: {
                    $set: {
                      access_granted: true,
                      channel_access_date: { $date: new Date().toISOString() },
                      updated_at: { $date: new Date().toISOString() },
                    },
                  },
                },
              ],
            });

            // Enviar mensaje privado de confirmación
            try {
              await this.bot.telegram.sendMessage(
                telegramUserId,
                `✅ *¡Bienvenido, ${firstName}!*\n\n` +
                  `Tu solicitud de unión a *${chat.title}* ha sido aprobada automáticamente.\n\n` +
                  `Ya puedes acceder al canal y disfrutar del contenido premium 🎯\n\n` +
                  `¡Gracias por tu compra!`,
                { parse_mode: 'Markdown' },
              );
            } catch (msgErr) {
              this.logger.warn('Could not send approval message:', msgErr.message);
            }
            return;
          } catch (approveError: any) {
            this.logger.error('Error approving join request:', approveError.message);
            // Si falla la aprobación, intentar notificar al usuario
            try {
              await this.bot.telegram.sendMessage(
                telegramUserId,
                `⚠️ Hubo un problema al aprobar tu solicitud.\n\nPor favor, intenta unirte nuevamente en unos minutos.`,
                { parse_mode: 'Markdown' },
              );
            } catch (e) {}
          }
        }
      }

      // Usuario no autorizado - NO tiene compra válida para este canal
      this.logger.warn(`❌ User ${telegramUserId} NOT authorized for channel ${channelId} - no valid purchase found`);

      // Rechazar la solicitud
      try {
        await this.bot.telegram.declineChatJoinRequest(channelId, parseInt(telegramUserId));
        this.logger.log(`Declined join request for user ${telegramUserId}`);
      } catch (declineErr: any) {
        this.logger.warn('Could not decline join request:', declineErr.message);
      }

      // Enviar mensaje explicando que necesita comprar
      try {
        // Obtener información del tipster para el link de compra
        let purchaseInfo = '';
        if (channel?.tipster_id) {
          const tipster = await this.prisma.tipsterProfile.findUnique({
            where: { id: channel.tipster_id },
          });
          if (tipster?.publicName) {
            purchaseInfo = `\n\nPuedes adquirir acceso visitando el perfil de *${tipster.publicName}* en nuestra plataforma.`;
          }
        }

        await this.bot.telegram.sendMessage(
          telegramUserId,
          `❌ *Acceso denegado*\n\n` +
            `Hola ${firstName}, no encontramos una compra válida asociada a tu cuenta de Telegram para el canal *${chat.title}*.\n\n` +
            `📋 *Posibles causas:*\n` +
            `• No has realizado la compra del producto\n` +
            `• Tu suscripción ha expirado\n` +
            `• Usaste un Telegram diferente al momento de la compra\n\n` +
            `Para obtener acceso, necesitas comprar el producto correspondiente.${purchaseInfo}`,
          { parse_mode: 'Markdown' },
        );
      } catch (msgError: any) {
        this.logger.warn('Could not send denial message:', msgError.message);
      }
    } catch (error: any) {
      this.logger.error('Error in handleJoinRequest:', error.message);
    }
  }

  // Método para manejar la conexión automática del canal
  private async handleChannelConnection(
    channelId: string,
    channelTitle: string,
    channelUsername?: string,
  ) {
    this.logger.log(`🔗 Processing channel connection: ${channelTitle} (${channelId})`);

    // 1. Buscar tipsters que están esperando vincular un canal de publicación
    const pendingResult = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: {
        publication_channel_pending: true,
      },
      projection: {
        _id: 1,
        public_name: 1,
        user_id: 1,
      },
    })) as any;

    const pendingTipsters = pendingResult.cursor?.firstBatch || [];

    if (pendingTipsters.length > 0) {
      // Vincular al primer tipster que está esperando (FIFO)
      const tipster = pendingTipsters[0];
      const tipsterId = tipster._id.$oid || tipster._id;

      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [
          {
            q: { _id: { $oid: tipsterId } },
            u: {
              $set: {
                publication_channel_id: channelId,
                publication_channel_title: channelTitle,
                publication_channel_username: channelUsername ? `@${channelUsername}` : null,
                publication_channel_pending: false,
                updated_at: { $date: new Date().toISOString() },
              },
            },
          },
        ],
      });

      this.logger.log(`✅ Auto-configured publication channel for tipster: ${tipster.public_name}`);

      // Enviar mensaje de confirmación al canal
      await this.bot.telegram.sendMessage(
        channelId,
        `✅ *¡Canal de Publicación Configurado\\!*\n\n` +
          `Este canal ha sido vinculado como canal de publicación para *${this.escapeMarkdownV2(tipster.public_name || 'Tipster')}*\\.\n\n` +
          `Ahora puedes usar el botón "📱 Compartir" en tus productos para publicarlos aquí automáticamente\\.`,
        { parse_mode: 'MarkdownV2' },
      );

      return;
    }

    // 2. Buscar un tipster que tenga este canal registrado por username (legacy)
    if (channelUsername) {
      const tipster = await this.prisma.tipsterProfile.findFirst({
        where: {
          OR: [
            { telegramChannelName: `@${channelUsername}` },
            { telegramChannelName: channelUsername },
          ],
        },
      });

      if (tipster) {
        // Actualizar con la conexión automática
        await this.prisma.$runCommandRaw({
          update: 'tipster_profiles',
          updates: [
            {
              q: { _id: { $oid: tipster.id } },
              u: {
                $set: {
                  telegram_channel_id: channelId,
                  telegram_channel_title: channelTitle,
                  telegram_connected_at: { $date: new Date().toISOString() },
                  telegram_connection_type: 'auto',
                  updated_at: { $date: new Date().toISOString() },
                },
              },
            },
          ],
        });

        this.logger.log(`✅ Auto-connected channel for tipster: ${tipster.publicName}`);

        // Enviar mensaje de confirmación al canal
        await this.sendMessage(
          channelId,
          '✅ Canal conectado exitosamente con Antia. Ahora puedes publicar tus pronósticos aquí.',
        );
      }
    }
  }

  /**
   * Escapar caracteres para MarkdownV2
   */
  private escapeMarkdownV2(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }

  /**
   * Conectar un canal manualmente
   */
  async connectChannelManually(
    tipsterId: string,
    channelIdentifier: string,
  ): Promise<{ success: boolean; message: string; channelInfo?: any }> {
    if (!this.bot) {
      return {
        success: false,
        message: 'Telegram bot no está disponible',
      };
    }

    try {
      // Verificar si es un username o un ID
      let chatInfo;

      try {
        if (channelIdentifier.startsWith('@') || !channelIdentifier.startsWith('-')) {
          // Es un username
          chatInfo = await this.bot.telegram.getChat(channelIdentifier);
        } else {
          // Es un ID numérico
          chatInfo = await this.bot.telegram.getChat(channelIdentifier);
        }
      } catch (error) {
        return {
          success: false,
          message: `No se puede acceder al canal "${channelIdentifier}". Verifica que el ID o username sea correcto.`,
        };
      }

      // Verificar que el bot es administrador
      const botInfo = await this.bot.telegram.getMe();
      let botMember;

      try {
        botMember = await this.bot.telegram.getChatMember(chatInfo.id.toString(), botInfo.id);
      } catch (error) {
        // Si no podemos obtener info del bot, probablemente no está en el canal
        return {
          success: false,
          message: `El bot @${botInfo.username} no está añadido al canal. Por favor:\n\n1. Ve a tu canal de Telegram\n2. Añade el bot como administrador\n3. Dale permiso para "Post messages"\n4. Intenta conectar nuevamente`,
        };
      }

      if (botMember.status !== 'administrator' && botMember.status !== 'creator') {
        return {
          success: false,
          message: `El bot está en el canal pero no es administrador. Por favor, asegúrate de darle permisos de administrador con la opción "Post messages" activada.`,
        };
      }

      // Actualizar el perfil del tipster
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [
          {
            q: { _id: { $oid: tipsterId } },
            u: {
              $set: {
                telegram_channel_id: chatInfo.id.toString(),
                telegram_channel_name: 'username' in chatInfo ? `@${chatInfo.username}` : null,
                telegram_channel_title: 'title' in chatInfo ? chatInfo.title : null,
                telegram_connected_at: { $date: new Date().toISOString() },
                telegram_connection_type: 'manual',
                updated_at: { $date: new Date().toISOString() },
              },
            },
          },
        ],
      });

      this.logger.log(`✅ Manually connected channel for tipster ID: ${tipsterId}`);

      return {
        success: true,
        message: 'Canal conectado exitosamente',
        channelInfo: {
          id: chatInfo.id.toString(),
          title: 'title' in chatInfo ? chatInfo.title : 'N/A',
          username: 'username' in chatInfo ? chatInfo.username : null,
        },
      };
    } catch (error) {
      this.logger.error('Error connecting channel manually:', error);
      return {
        success: false,
        message:
          error.message ||
          'Error al conectar el canal. Verifica que el ID/username sea correcto y que el bot sea administrador.',
      };
    }
  }

  /**
   * Desconectar un canal
   */
  async disconnectChannel(tipsterId: string): Promise<void> {
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipsterId } },
          u: {
            $set: {
              telegram_channel_id: null,
              telegram_channel_name: null,
              telegram_channel_title: null,
              telegram_connected_at: null,
              telegram_connection_type: null,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    this.logger.log(`✅ Disconnected channel for tipster ID: ${tipsterId}`);
  }

  /**
   * Publicar un producto en Telegram
   */
  async publishProduct(
    channelId: string,
    product: any,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.bot) {
      return {
        success: false,
        message: 'Telegram bot no está disponible',
      };
    }

    try {
      const message = this.formatProductMessage(product);

      await this.bot.telegram.sendMessage(channelId, message, {
        parse_mode: 'Markdown',
      });

      this.logger.log(`✅ Published product ${product.id} to channel ${channelId}`);

      return {
        success: true,
        message: 'Producto publicado exitosamente en Telegram',
      };
    } catch (error) {
      this.logger.error('Error publishing product:', error);
      return {
        success: false,
        message: error.message || 'Error al publicar en Telegram',
      };
    }
  }

  /**
   * Formatear mensaje del producto
   */
  private formatProductMessage(product: any): string {
    const { title, description, priceCents, currency, validityDays, id } = product;

    const price = (priceCents / 100).toFixed(2);
    const botLink = `https://t.me/${process.env.TELEGRAM_BOT_NAME || 'Antiabetbot'}?start=product_${id}`;

    return `
🎯 *Nuevo Pronóstico VIP*

📋 *Título:* ${this.escapeMarkdown(title)}
📝 *Descripción:* ${this.escapeMarkdown(description || 'Sin descripción')}
💰 *Precio:* €${price}
📅 *Validez:* ${validityDays} días

🔗 [Comprar Ahora](${botLink})
    `.trim();
  }

  /**
   * Escapar caracteres especiales de Markdown
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Enviar un mensaje simple - usa proxy como método principal
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      // Try via HTTP proxy first (bypasses firewall)
      await this.httpService.sendMessage(chatId, text);
      this.logger.log(`✅ Message sent to ${chatId} via proxy`);
    } catch (proxyError) {
      this.logger.warn(`Proxy send failed, trying direct: ${proxyError.message}`);
      // Fallback to direct if proxy fails
      if (this.bot) {
        try {
          await this.bot.telegram.sendMessage(chatId, text);
        } catch (directError) {
          this.logger.error(`Error sending message to ${chatId}:`, directError.message);
        }
      }
    }
  }

  /**
   * FLUJO DE COMPRA DEL CLIENTE
   */
  private async handleProductPurchaseFlow(ctx: any, productId: string) {
    try {
      // 1. Obtener información del producto
      const product: any = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || !product.active) {
        await ctx.reply('❌ Este producto ya no está disponible.');
        return;
      }

      // Obtener tipster
      const tipster: any = await this.prisma.tipsterProfile.findUnique({
        where: { id: product.tipsterId },
      });

      const userId = ctx.from.id.toString();
      const username = ctx.from.username || ctx.from.first_name || 'Usuario';

      // 2. Mensaje de bienvenida
      await ctx.reply(
        `🎯 *¡Bienvenido a Antia!*\n\n` +
          `Estás a punto de adquirir un pronóstico de *${tipster?.publicName || 'Tipster'}*\n\n` +
          `Para continuar, necesitamos que aceptes nuestros términos.`,
        { parse_mode: 'Markdown' },
      );

      // 3. Mostrar términos y condiciones
      await this.showTermsAndConditions(ctx, productId);
    } catch (error) {
      this.logger.error('Error in handleProductPurchaseFlow:', error);
      await ctx.reply('Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Mostrar términos y condiciones
   */
  private async showTermsAndConditions(ctx: any, productId: string) {
    const termsMessage =
      `📋 *Términos y Condiciones*\n\n` +
      `Antes de continuar, confirma lo siguiente:\n\n` +
      `✅ Soy mayor de 18 años\n` +
      `✅ Acepto los términos y condiciones de Antia\n` +
      `✅ Entiendo que las apuestas pueden generar pérdidas\n` +
      `✅ Acepto la política de privacidad\n\n` +
      `¿Aceptas estos términos?`;

    await ctx.reply(termsMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Aceptar', callback_data: `accept_terms_${productId}` },
            { text: '❌ Cancelar', callback_data: 'cancel_purchase' },
          ],
        ],
      },
    });
  }

  /**
   * Handler para callbacks (botones inline)
   */
  private setupCallbackHandlers() {
    // Aceptar términos
    this.bot.action(/accept_terms_(.+)/, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const productId = ctx.match[1];
        await this.showProductDetails(ctx, productId);
      } catch (error) {
        this.logger.error('Error in accept_terms callback:', error);
      }
    });

    // Cancelar compra
    this.bot.action('cancel_purchase', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        'Compra cancelada. Si cambias de opinión, vuelve a usar el link del producto.',
      );
    });

    // Proceder al pago
    this.bot.action(/proceed_payment_(.+)/, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        const productId = ctx.match[1];
        await this.generateCheckoutLink(ctx, productId);
      } catch (error) {
        this.logger.error('Error in proceed_payment callback:', error);
      }
    });
  }

  /**
   * Mostrar detalles del producto
   */
  private async showProductDetails(ctx: any, productId: string) {
    try {
      const product: any = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        await ctx.reply('❌ Producto no encontrado.');
        return;
      }

      const tipster: any = await this.prisma.tipsterProfile.findUnique({
        where: { id: product.tipsterId },
      });

      const price = (product.priceCents / 100).toFixed(2);

      const productMessage =
        `🎯 *${product.title}*\n\n` +
        `${product.description || 'Pronóstico premium'}\n\n` +
        `💰 *Precio:* €${price}\n` +
        `📅 *Validez:* ${product.validityDays || 30} días\n` +
        `👤 *Tipster:* ${tipster?.publicName || 'Tipster'}\n\n` +
        `Al completar la compra, recibirás acceso inmediato al canal premium del tipster.`;

      await ctx.reply(productMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Proceder al Pago', callback_data: `proceed_payment_${productId}` }],
            [{ text: '❌ Cancelar', callback_data: 'cancel_purchase' }],
          ],
        },
      });
    } catch (error) {
      this.logger.error('Error showing product details:', error);
    }
  }

  /**
   * Generar link de checkout
   */
  private async generateCheckoutLink(ctx: any, productId: string) {
    try {
      const product: any = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        await ctx.reply('❌ Producto no encontrado.');
        return;
      }

      const userId = ctx.from.id.toString();
      const username = ctx.from.username || ctx.from.first_name;

      // Generar link de checkout con parámetros de Telegram
      const appUrl = this.config.get('APP_URL');
      const checkoutUrl = `${appUrl}/checkout/${productId}?telegram_user_id=${userId}&telegram_username=${encodeURIComponent(username || '')}`;

      await ctx.reply(
        `💳 *Realizar Pago*\n\n` +
          `Haz clic en el botón de abajo para ir a la página de pago segura.\n\n` +
          `Podrás pagar como:\n` +
          `• 👤 Usuario invitado (solo email)\n` +
          `• 📝 Registrarte para futuras compras\n\n` +
          `Métodos de pago: Tarjeta de crédito/débito`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '💳 Ir a Pagar', url: checkoutUrl }]],
          },
        },
      );

      // Mensaje informativo
      await ctx.reply(
        `⏳ Una vez que completes el pago, regresa aquí.\n` +
          `Te notificaré automáticamente cuando el pago sea confirmado y te daré acceso al canal premium.`,
      );
    } catch (error) {
      this.logger.error('Error generating checkout link:', error);
      await ctx.reply('Hubo un error al generar el link de pago. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Crear orden pendiente
   */
  private async createPendingOrder(
    productId: string,
    telegramUserId: string,
    username: string,
  ): Promise<string> {
    const orderId = this.generateOrderId();
    const now = new Date();

    // Guardar orden en base de datos
    await this.prisma.$runCommandRaw({
      insert: 'orders',
      documents: [
        {
          _id: orderId,
          product_id: productId,
          telegram_user_id: telegramUserId,
          telegram_username: username,
          status: 'PENDING',
          payment_method: null,
          amount_cents: null,
          created_at: { $date: now.toISOString() },
          updated_at: { $date: now.toISOString() },
        },
      ],
    });

    this.logger.log(`Created pending order ${orderId} for Telegram user ${telegramUserId}`);
    return orderId;
  }

  /**
   * Generar ID de orden
   */
  private generateOrderId(): string {
    return 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Notificar al cliente sobre pago exitoso - usa proxy para enviar mensajes
   */
  async notifyPaymentSuccess(telegramUserId: string, orderId: string, productId: string) {
    try {
      this.logger.log(
        `Processing payment success notification for user ${telegramUserId}, order ${orderId}`,
      );

      // Obtener producto e información del tipster
      const product: any = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        this.logger.error('Product not found for notification');
        return { success: false, error: 'Product not found' };
      }

      const tipster: any = await this.prisma.tipsterProfile.findUnique({
        where: { id: product.tipsterId },
      });

      if (!tipster) {
        this.logger.error('Tipster not found for notification');
        return { success: false, error: 'Tipster not found' };
      }

      // Helper function to send message via proxy
      const sendMessageViaProxy = async (chatId: string, text: string, options: any = {}) => {
        try {
          await this.httpService.sendMessage(chatId, text, {
            parseMode: options.parse_mode || 'Markdown',
            replyMarkup: options.reply_markup,
          });
          return true;
        } catch (error) {
          this.logger.error(`Failed to send message via proxy: ${error.message}`);
          return false;
        }
      };

      // Mensaje 1: Agradecimiento y soporte
      const thankYouMessage =
        `✅ *Gracias por su compra*\n\n` +
        `A continuación recibirá acceso a su servicio.\n\n` +
        `Si tiene alguna consulta, puede contactar con soporte en @AntiaSupport`;

      await sendMessageViaProxy(telegramUserId, thankYouMessage);

      // Buscar el canal específico asociado al producto
      let channelLink: string | null = null;
      let channelTitle: string = product.title;
      let channelId: string | null = null;

      if (product.telegramChannelId) {
        // Buscar el canal en la colección telegram_channels
        const channelResult = (await this.prisma.$runCommandRaw({
          find: 'telegram_channels',
          filter: {
            channel_id: product.telegramChannelId,
            tipster_id: tipster.id,
            is_active: true,
          },
          projection: { invite_link: 1, channel_title: 1, channel_id: 1 },
          limit: 1,
        })) as any;

        const channel = channelResult.cursor?.firstBatch?.[0];
        if (channel) {
          channelLink = channel.invite_link;
          channelTitle = channel.channel_title || product.title;
          channelId = channel.channel_id;
          this.logger.log(`Found product channel: ${channelTitle} with link: ${channelLink}`);
        }

        // Si no hay invite_link, intentar generarlo via proxy
        if (!channelLink && channelId) {
          this.logger.log(`No invite link found, trying to generate one for channel ${channelId}`);
          try {
            channelLink = await this.httpService.exportChatInviteLink(channelId);
            this.logger.log(`✅ Generated invite link via proxy: ${channelLink}`);

            // Guardar el link en la base de datos
            if (channel._id) {
              await this.prisma.$runCommandRaw({
                update: 'telegram_channels',
                updates: [
                  {
                    q: { _id: channel._id },
                    u: {
                      $set: {
                        invite_link: channelLink,
                        updated_at: { $date: new Date().toISOString() },
                      },
                    },
                  },
                ],
              });
            }
          } catch (e) {
            this.logger.warn(`Could not generate invite link: ${e.message}`);
            // Try creating a new invite link with more options
            try {
              const inviteResult = await this.httpService.createChatInviteLink(channelId, {
                createsJoinRequest: false,
              });
              channelLink = inviteResult.invite_link;
              this.logger.log(`✅ Created invite link via proxy: ${channelLink}`);
            } catch (e2) {
              this.logger.error(`Also failed to create invite link: ${e2.message}`);
            }
          }
        }
      }

      // Si no hay canal específico del producto, buscar el canal legacy del tipster
      if (!channelLink) {
        const tipsterProfileResult = (await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { _id: { $oid: tipster.id } },
          projection: { premium_channel_link: 1 },
          limit: 1,
        })) as any;

        channelLink = tipsterProfileResult.cursor?.firstBatch?.[0]?.premium_channel_link || null;
        if (channelLink) {
          this.logger.log(`Using legacy tipster premium channel link: ${channelLink}`);
        }
      }

      // Si hay un enlace de canal configurado, enviarlo con flujo de join request
      if (channelLink) {
        // Mensaje 2: Acceso al canal premium con instrucciones de join request
        const accessMessage =
          `🎯 *Acceso a tu canal premium*\n\n` +
          `Para unirte a *${channelTitle}*:\n\n` +
          `1️⃣ Haz clic en el botón de abajo\n` +
          `2️⃣ Pulsa *"Solicitar unirme"*\n` +
          `3️⃣ Tu solicitud será *aprobada automáticamente* ✅\n\n` +
          `_El sistema verificará tu compra y te dará acceso al instante._`;

        await sendMessageViaProxy(telegramUserId, accessMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 Solicitar acceso al Canal', url: channelLink }]],
          },
        });

        // Mensaje 3: Confirmación final
        await sendMessageViaProxy(
          telegramUserId,
          `✅ *Compra finalizada*\n\nSolicita tu acceso usando el botón de arriba.`,
        );

        this.logger.log(
          `✅ Payment success notification with join request link sent to ${telegramUserId}`,
        );
        return { success: true, inviteLink: channelLink };
      } else {
        // El tipster no tiene canal premium configurado - solo confirmar la compra
        const noChannelMessage =
          `🎯 *Compra autorizada*\n\n` +
          `Su compra ha sido procesada correctamente.\n\n` +
          `El tipster *${tipster.publicName}* le contactará pronto con los detalles de acceso.`;

        await sendMessageViaProxy(telegramUserId, noChannelMessage);

        this.logger.log(
          `Payment success notification (no premium channel) sent to ${telegramUserId}`,
        );
        return { success: true, inviteLink: null };
      }
    } catch (error) {
      this.logger.error('Error notifying payment success:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar al tipster sobre una nueva venta - usa proxy
   */
  async notifyTipsterNewSale(
    tipsterId: string,
    orderId: string,
    productId: string,
    amountCents: number,
    currency: string,
    buyerEmail?: string,
    buyerUsername?: string,
    netAmountCents?: number, // NEW: Net amount after commissions
  ) {
    try {
      this.logger.log(`Notifying tipster ${tipsterId} about sale ${orderId}`);

      // Get tipster info
      const tipster: any = await this.prisma.tipsterProfile.findUnique({
        where: { id: tipsterId },
      });

      if (!tipster) {
        this.logger.error('Tipster not found for sale notification');
        return { success: false, error: 'Tipster not found' };
      }

      // Get product info
      const product: any = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      // Use net amount if provided, otherwise calculate approximate (fallback)
      const earningsAmount = netAmountCents ?? Math.round(amountCents * 0.9); // Default ~10% commission if not provided
      
      // Format prices
      const grossFormatted = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
      }).format(amountCents / 100);
      
      const netFormatted = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
      }).format(earningsAmount / 100);

      // Get tipster's Telegram ID to send notification
      if (tipster.telegramUserId) {
        const saleMessage =
          `💰 *¡Nueva Venta!*\n\n` +
          `Has recibido una nueva compra:\n\n` +
          `📦 *Producto:* ${product?.title || 'Producto'}\n` +
          `💵 *Importe bruto:* ${grossFormatted}\n` +
          `✅ *Tu ganancia:* ${netFormatted}\n` +
          `👤 *Comprador:* ${buyerUsername || buyerEmail || 'Anónimo'}\n` +
          `📅 *Fecha:* ${new Date().toLocaleString('es-ES')}\n\n` +
          `El cliente ya tiene acceso al contenido.`;

        try {
          // Use proxy to send message
          await this.httpService.sendMessage(tipster.telegramUserId, saleMessage, {
            parseMode: 'Markdown',
          });
          this.logger.log(`✅ Sale notification sent to tipster ${tipsterId} via proxy`);
        } catch (sendError) {
          this.logger.error('Error sending sale notification to tipster:', sendError.message);
        }
      }

      // Update tipster's earnings in database with NET amount (not gross)
      await this.updateTipsterEarnings(tipsterId, earningsAmount, currency);

      return { success: true };
    } catch (error) {
      this.logger.error('Error notifying tipster of sale:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update tipster earnings
   */
  private async updateTipsterEarnings(tipsterId: string, amountCents: number, currency: string) {
    try {
      // Get current earnings
      const result = (await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $oid: tipsterId } },
        projection: { total_earnings_cents: 1, total_sales: 1 },
        limit: 1,
      })) as any;

      const currentEarnings = result.cursor?.firstBatch?.[0]?.total_earnings_cents || 0;
      const currentSales = result.cursor?.firstBatch?.[0]?.total_sales || 0;

      // Update earnings
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [
          {
            q: { _id: { $oid: tipsterId } },
            u: {
              $set: {
                total_earnings_cents: currentEarnings + amountCents,
                total_sales: currentSales + 1,
                last_sale_at: { $date: new Date().toISOString() },
                updated_at: { $date: new Date().toISOString() },
              },
            },
          },
        ],
      });

      this.logger.log(`Updated earnings for tipster ${tipsterId}: +${amountCents} cents`);
    } catch (error) {
      this.logger.error('Error updating tipster earnings:', error);
    }
  }

  /**
   * Verificar si un canal está conectado
   */
  async isChannelConnected(tipsterId: string): Promise<boolean> {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
    });
    return !!tipster?.telegramChannelId;
  }

  /**
   * Asegurar que el webhook esté configurado antes de procesar
   */
  /**
   * Ensure webhook is configured (non-blocking, runs in background)
   */
  private ensureWebhookAsync(): void {
    const webhookUrl = (this as any).webhookUrl;
    if (!webhookUrl) return;

    // Run in background without blocking the webhook response
    setImmediate(async () => {
      try {
        const info = await this.httpService.getWebhookInfo();
        if (!info.url || info.url !== webhookUrl) {
          this.logger.log('🔄 Re-configuring webhook in background...');
          await this.httpService.setWebhook(webhookUrl, {
            allowedUpdates: ['message', 'callback_query', 'my_chat_member', 'chat_join_request'],
            dropPendingUpdates: false,
            maxConnections: 100,
          });
        }
      } catch (e) {
        // Silently ignore - webhook check is non-critical
      }
    });
  }

  /**
   * Manejar updates desde webhook - PROCESA DIRECTAMENTE VIA PROXY
   */
  async handleUpdate(update: any) {
    try {
      this.logger.log(`Processing webhook update: ${JSON.stringify(update).substring(0, 200)}`);

      // Process my_chat_member directly (critical - needs sync processing)
      if (update.my_chat_member) {
        await this.handleMyChatMemberUpdate(update.my_chat_member);
        this.logger.log('Webhook my_chat_member processed successfully');
        return;
      }

      // Process channel_post directly (critical for detecting new channels)
      if (update.channel_post) {
        const chat = update.channel_post.chat;
        if (chat && chat.type === 'channel') {
          this.logger.log(`📬 Webhook channel_post: ${chat.title} (${chat.id})`);
          await this.saveDetectedChannel(chat.id.toString(), chat.title, chat.username, chat.type);
          this.logger.log('Webhook channel_post processed - channel saved');
        }
        return;
      }

      // Process message updates directly (bypass Telegraf to use proxy)
      if (update.message) {
        setImmediate(async () => {
          try {
            await this.handleMessageUpdateViaProxy(update.message);
          } catch (err) {
            this.logger.error('Message processing failed:', err.message);
          }
        });
        return;
      }

      // Process callback queries directly
      if (update.callback_query) {
        setImmediate(async () => {
          try {
            await this.handleCallbackQueryViaProxy(update.callback_query);
          } catch (err) {
            this.logger.error('Callback processing failed:', err.message);
          }
        });
        return;
      }

      // Process chat join requests
      if (update.chat_join_request) {
        setImmediate(async () => {
          try {
            await this.handleChatJoinRequestViaProxy(update.chat_join_request);
          } catch (err) {
            this.logger.error('Join request processing failed:', err.message);
          }
        });
        return;
      }

      // For other updates, try using Telegraf as fallback
      if (this.bot) {
        setImmediate(async () => {
          try {
            await this.bot.handleUpdate(update);
            this.logger.log('Webhook update processed via Telegraf (background)');
          } catch (err) {
            this.logger.error('Telegraf processing failed:', err.message);
          }
        });
      }

      // Ensure webhook is still configured (non-blocking)
      this.ensureWebhookAsync();
    } catch (error) {
      this.logger.error('Error handling update:', error);
    }
  }

  /**
   * Handle message updates directly via proxy (bypass Telegraf)
   */
  private async handleMessageUpdateViaProxy(message: any) {
    const chatId = message.chat?.id?.toString();
    const text = message.text || '';
    const userId = message.from?.id?.toString();

    if (!chatId || !userId) {
      this.logger.warn('Message missing chatId or userId');
      return;
    }

    this.logger.log(`📨 Processing message from ${userId}: ${text.substring(0, 50)}`);

    // Handle /start command
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const payload = parts[1] || '';

      this.logger.log(`📥 /start command from user ${userId}, full text: "${text}", payload: "${payload || 'NONE'}"`);

      // Handle order_ payload (post-payment access) - HIGHEST PRIORITY
      if (payload.startsWith('order_')) {
        const orderId = payload.replace('order_', '');
        this.logger.log(`🎯 Post-payment flow for order: ${orderId}`);
        await this.handlePostPaymentAccessViaProxy(orderId, userId);
        return;
      }

      // Handle product_ payload (redirect to checkout)
      if (payload.startsWith('product_')) {
        const productId = payload.replace('product_', '');
        this.logger.log(`🔄 Redirecting to web checkout for product: ${productId}`);

        const appUrl = this.config.get('APP_URL');
        const checkoutUrl = `${appUrl}/checkout/${productId}`;

        await this.httpService.sendMessage(
          userId,
          '👋 ¡Bienvenido a Antia!\n\n' +
            '💳 Para completar tu compra, haz clic en el botón de abajo:\n\n' +
            '_Serás redirigido a nuestra página de pago seguro._',
          {
            parseMode: 'Markdown',
            replyMarkup: {
              inline_keyboard: [[{ text: '💳 Ir al Checkout', url: checkoutUrl }]],
            },
          },
        );
        return;
      }

      // Handle vincular_registro payload - Para usuarios registrándose como tipster
      if (payload === 'vincular_registro') {
        this.logger.log(`📝 Registration flow vincular for user ${userId}`);
        await this.handleVincularCommand(message, 'registro');
        return;
      }

      // Handle vincular payload - Para tipsters ya aprobados que necesitan conectar
      if (payload === 'vincular') {
        this.logger.log(`🔗 Post-approval vincular for user ${userId}`);
        await this.handleVincularCommand(message, 'aprobado');
        return;
      }

      // Para /start sin payload -> mensaje de bienvenida general
      this.logger.log(`👋 Welcome message for user ${userId}`);
      await this.httpService.sendMessage(
        userId,
        '👋 ¡Bienvenido a Antia!\n\n' +
          '🛒 *¿Cómo comprar?*\n\n' +
          '1️⃣ Busca el producto que te interesa en el canal del tipster\n' +
          '2️⃣ Haz clic en el enlace de compra\n' +
          '3️⃣ Completa el pago en nuestra web\n' +
          '4️⃣ Vuelve aquí automáticamente para recibir tu acceso\n\n' +
          '✅ *¿Ya pagaste?*\n' +
          'Si ya realizaste una compra, deberías haber sido redirigido aquí automáticamente con tu acceso.\n\n' +
          '🔗 *¿Eres tipster?*\n' +
          'Usa el comando /vincular para conectar tu cuenta.\n\n' +
          '❓ *¿Necesitas ayuda?*\n' +
          'Contacta con @AntiaSupport',
        { parseMode: 'Markdown' },
      );
      return;
    }

    // Handle /info command
    if (text.startsWith('/info')) {
      const chat = message.chat;
      await this.httpService.sendMessage(
        chatId,
        `📊 *Información del Chat*\n\n` +
          `🆔 Chat ID: \`${chatId}\`\n` +
          `📝 Tipo: ${chat.type}\n` +
          `🏷️ Título: ${chat.title || 'N/A'}\n` +
          `👤 Username: @${chat.username || 'N/A'}`,
        { parseMode: 'Markdown' },
      );
      return;
    }

    // Handle /vincular command - Link Telegram account to tipster profile
    if (text.startsWith('/vincular')) {
      this.logger.log(`📱 /vincular command from user: ${userId}`);
      // El comando /vincular manual es para tipsters ya aprobados
      await this.handleVincularCommand(message, 'aprobado');
      return;
    }

    // For other messages, send a help message
    if (message.chat?.type === 'private') {
      await this.httpService.sendMessage(
        userId,
        '👋 Hola! Soy el bot de Antia.\n\n' +
          'Usa /start para ver las opciones disponibles.\n' +
          'Si necesitas ayuda, contacta con @AntiaSupport',
        { parseMode: 'Markdown' },
      );
    }
  }

  /**
   * Handle /vincular command - generates a link code for account linking
   * @param message - Telegram message object
   * @param context - 'registro' (during registration) or 'aprobado' (post-approval)
   */
  private async handleVincularCommand(message: any, context: 'registro' | 'aprobado' = 'aprobado') {
    const userId = message.from?.id?.toString();
    const telegramUsername = message.from?.username || null;
    const firstName = message.from?.first_name || '';
    const lastName = message.from?.last_name || '';

    if (!userId) {
      this.logger.warn('handleVincularCommand: No userId found');
      return;
    }

    this.logger.log(`📱 handleVincularCommand for user: ${userId} (@${telegramUsername}), context: ${context}`);

    try {
      // Generate unique link code
      const linkCode = this.generateLinkCode(userId);
      
      // Save code to database with context
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      await this.prisma.$runCommandRaw({
        update: 'telegram_link_codes',
        updates: [
          {
            q: { telegram_user_id: userId },
            u: {
              $set: {
                telegram_user_id: userId,
                telegram_username: telegramUsername,
                first_name: firstName,
                last_name: lastName,
                link_code: linkCode,
                context: context, // 'registro' or 'aprobado'
                created_at: { $date: now },
                expires_at: { $date: expiresAt },
                used: false,
              },
            },
            upsert: true,
          },
        ],
      });

      // Get platform URL
      const appUrl = this.config.get<string>('APP_URL') || 'https://antia.com';
      
      // Generate different links based on context
      if (context === 'registro') {
        // During registration - redirect back to register page
        const linkUrl = `${appUrl}/register?telegram_code=${linkCode}&telegram_username=${encodeURIComponent(telegramUsername || '')}`;

        await this.httpService.sendMessage(
          userId,
          '🔗 *Vinculación de Telegram*\n\n' +
            'Para continuar con el registro, pulsa el botón de abajo:\n',
          { 
            parseMode: 'Markdown',
            replyMarkup: {
              inline_keyboard: [
                [{ text: '✅ Completar Registro', url: linkUrl }],
              ],
            },
          },
        );
      } else {
        // Post-approval - redirect to connect-telegram page
        const linkUrl = `${appUrl}/connect-telegram?code=${linkCode}`;

        await this.httpService.sendMessage(
          userId,
          '🔗 *Vincular tu cuenta de Telegram*\n\n' +
            '✅ ¡Tu Telegram está listo para vincularse!\n\n' +
            '*Opción 1 - Automática (Recomendada):*\n' +
            'Haz clic en el botón de abajo para vincular y acceder directamente.\n\n' +
            '*Opción 2 - Manual:*\n' +
            `Tu código es: \`${linkCode}\`\n` +
            'Cópialo e ingrésalo en la plataforma.\n\n' +
            '⏰ El código expira en 10 minutos.\n\n' +
            'Una vez vinculado, todos los canales donde añadas el bot como admin se conectarán automáticamente.',
          { 
            parseMode: 'Markdown',
            replyMarkup: {
              inline_keyboard: [
                [{ text: '🚀 Vincular y Acceder', url: linkUrl }],
              ],
            },
          },
        );
      }

      this.logger.log(`✅ Link code generated for ${userId}: ${linkCode} (context: ${context})`);
    } catch (error) {
      this.logger.error('Error in handleVincularCommand:', error);
      await this.httpService.sendMessage(
        userId,
        '❌ Error al generar el código de vinculación.\n' +
          'Por favor, intenta de nuevo más tarde.',
      );
    }
  }

  /**
   * Handle callback queries via proxy
   */
  private async handleCallbackQueryViaProxy(callbackQuery: any) {
    const userId = callbackQuery.from?.id?.toString();
    const data = callbackQuery.data || '';

    this.logger.log(`📲 Callback query from ${userId}: ${data}`);

    // Handle different callback types here if needed
    // For now, just acknowledge
  }

  /**
   * Handle chat join requests via proxy
   */
  private async handleChatJoinRequestViaProxy(joinRequest: any) {
    const { chat, from } = joinRequest;
    const chatId = chat.id.toString();
    const userId = from.id.toString();

    this.logger.log(`📥 Join request from ${userId} for chat ${chatId}`);

    // Check if user has a valid purchase for this channel
    try {
      const orderResult = (await this.prisma.$runCommandRaw({
        find: 'orders',
        filter: {
          telegram_user_id: userId,
          status: { $in: ['PAGADA', 'COMPLETED', 'paid'] },
        },
        sort: { created_at: -1 },
        limit: 5,
      })) as any;

      const orders = orderResult.cursor?.firstBatch || [];
      let hasAccess = false;

      for (const order of orders) {
        // Get product
        const productId = order.product_id;
        const productResult = (await this.prisma.$runCommandRaw({
          find: 'products',
          filter: { _id: { $oid: productId } },
          projection: { telegram_channel_id: 1 },
          limit: 1,
        })) as any;

        const product = productResult.cursor?.firstBatch?.[0];
        if (product?.telegram_channel_id === chatId) {
          hasAccess = true;
          break;
        }
      }

      if (hasAccess) {
        await this.httpService.approveChatJoinRequest(chatId, parseInt(userId));
        this.logger.log(`✅ Approved join request for ${userId} in ${chatId}`);

        await this.httpService.sendMessage(
          userId,
          '✅ *¡Solicitud aprobada!*\n\n' +
            `Has sido añadido al canal *${chat.title}*.\n` +
            '¡Disfruta del contenido!',
          { parseMode: 'Markdown' },
        );
      } else {
        await this.httpService.declineChatJoinRequest(chatId, parseInt(userId));
        this.logger.log(`❌ Declined join request for ${userId} in ${chatId} (no purchase)`);

        await this.httpService.sendMessage(
          userId,
          '❌ *Solicitud denegada*\n\n' +
            'No encontramos una compra válida para este canal.\n' +
            'Si crees que es un error, contacta con @AntiaSupport',
          { parseMode: 'Markdown' },
        );
      }
    } catch (error) {
      this.logger.error('Error handling join request:', error.message);
    }
  }

  /**
   * Manejar evento my_chat_member directamente (sin depender del bot)
   */
  private async handleMyChatMemberUpdate(myChatMember: any) {
    try {
      const { chat, new_chat_member, old_chat_member, from } = myChatMember;
      const chatTitle = chat.title || 'N/A';
      const chatId = chat.id.toString();
      const addedByUserId = from?.id?.toString() || null;
      const addedByUsername = from?.username || null;

      this.logger.log(
        `📥 my_chat_member event: ${chatTitle} (${chatId}) - new status: ${new_chat_member?.status} - from: ${addedByUserId}`,
      );

      // Verificar si el bot fue añadido como administrador
      if (
        new_chat_member?.status === 'administrator' &&
        (chat.type === 'channel' || chat.type === 'supergroup')
      ) {
        this.logger.log(`🎉 Bot added to channel: ${chatTitle} (${chatId}) by user: ${addedByUserId}`);

        // Guardar en la tabla de canales detectados CON el ID del usuario
        await this.saveDetectedChannel(
          chatId, 
          chatTitle, 
          chat.username, 
          chat.type,
          addedByUserId,
          addedByUsername
        );

        // Intentar auto-conectar el canal si el usuario ya está vinculado
        await this.tryAutoConnectChannel(chatId, chatTitle, chat.username, addedByUserId);

        // Legacy: manejar conexión automática para tipsters pendientes
        await this.handleChannelConnection(chatId, chatTitle, chat.username);
      }

      // Si el bot fue removido del canal, marcar como inactivo
      if (
        (old_chat_member?.status === 'administrator' || old_chat_member?.status === 'creator') &&
        (new_chat_member?.status === 'left' || new_chat_member?.status === 'kicked') &&
        (chat.type === 'channel' || chat.type === 'supergroup')
      ) {
        this.logger.log(`👋 Bot removed from channel: ${chatTitle} (${chatId})`);
        await this.markChannelAsInactive(chatId);
        await this.markConnectedChannelAsDisconnected(chatId);
      }
    } catch (error) {
      this.logger.error('Error handling my_chat_member:', error);
    }
  }

  /**
   * Obtener información del canal conectado
   */
  async getConnectedChannel(tipsterId: string) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
      select: {
        telegramChannelId: true,
        telegramChannelName: true,
        telegramChannelTitle: true,
        telegramConnectedAt: true,
        telegramConnectionType: true,
      },
    });

    if (!tipster?.telegramChannelId) {
      return null;
    }

    return {
      id: tipster.telegramChannelId,
      name: tipster.telegramChannelName,
      title: tipster.telegramChannelTitle,
      connectedAt: tipster.telegramConnectedAt,
      connectionType: tipster.telegramConnectionType,
    };
  }

  /**
   * Verificar acceso al canal (si el bot es admin)
   */
  async verifyChannelAccess(channelId: string): Promise<{
    valid: boolean;
    title?: string;
    username?: string;
    type?: string;
    error?: string;
  }> {
    // Si el bot no está disponible, asumir que es válido
    if (!this.bot) {
      this.logger.warn(`Bot not available for verification of ${channelId}, assuming valid`);
      return { valid: true };
    }

    try {
      const chat = await this.bot.telegram.getChat(channelId);

      // Verify bot is admin
      const botInfo = await this.bot.telegram.getMe();
      const admins = await this.bot.telegram.getChatAdministrators(channelId);
      const isAdmin = admins.some((admin) => admin.user.id === botInfo.id);

      if (!isAdmin) {
        return {
          valid: false,
          error:
            'El bot no es administrador de este canal. Por favor, añade @Antiabetbot como administrador.',
        };
      }

      return {
        valid: true,
        title: 'title' in chat ? chat.title : undefined,
        username: 'username' in chat ? chat.username : undefined,
        type: chat.type,
      };
    } catch (error) {
      this.logger.error('Error verifying channel access:', error);
      // En caso de error de conectividad, asumir válido para no bloquear
      return { valid: true };
    }
  }

  /**
   * Publicar producto en el canal de publicación del tipster
   */
  async publishProductToChannel(
    tipsterId: string,
    productId: string,
    targetChannelId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get product
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return { success: false, message: 'Producto no encontrado' };
      }

      // Get tipster profile with publication channel
      const tipsterResult = (await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $oid: tipsterId } },
        projection: {
          publication_channel_id: 1,
          publication_channel_title: 1,
          public_name: 1,
        },
        limit: 1,
      })) as any;

      const tipsterProfile = tipsterResult.cursor?.firstBatch?.[0];

      if (!tipsterProfile) {
        return { success: false, message: 'Perfil de tipster no encontrado' };
      }

      // Determine which channel to use
      const channelId = targetChannelId || tipsterProfile.publication_channel_id;

      if (!channelId) {
        return {
          success: false,
          message:
            'No tienes un canal de publicación configurado. Configúralo en la sección de Telegram.',
        };
      }

      // Format and send message
      const price = (product.priceCents / 100).toFixed(2).replace('.', '\\.');
      const appUrl = process.env.APP_URL;
      const checkoutUrl = `${appUrl}/checkout/${product.id}`;
      const validityDays = product.validityDays || 30;
      const tipsterName = this.escapeMarkdown(tipsterProfile.public_name || 'Tipster');

      const message = `
🎯 *${this.escapeMarkdown(product.title)}*

${product.description ? this.escapeMarkdown(product.description) + '\n\n' : ''}💰 *Precio:* €${price}
📅 *Validez:* ${validityDays} días
👤 *Por:* ${tipsterName}

🛒 *¡Compra ahora y accede al contenido premium\\!*
      `.trim();

      await this.bot.telegram.sendMessage(channelId, message, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [[{ text: '💳 Comprar Ahora', url: checkoutUrl }]],
        },
      });

      this.logger.log(`✅ Published product ${productId} to channel ${channelId}`);

      return {
        success: true,
        message: '¡Producto publicado exitosamente en tu canal de Telegram!',
      };
    } catch (error) {
      this.logger.error('Error publishing product to channel:', error);
      return {
        success: false,
        message: 'Error al publicar: ' + (error.message || 'Error desconocido'),
      };
    }
  }

  /**
   * Get health status of Telegram bot
   */
  async getHealthStatus() {
    try {
      const webhookInfo = await this.bot.telegram.getWebhookInfo();
      const botInfo = await this.bot.telegram.getMe();

      return {
        isInitialized: this.isInitialized,
        botUsername: botInfo.username,
        botId: botInfo.id,
        webhookUrl: webhookInfo.url || null,
        pendingUpdates: webhookInfo.pending_update_count || 0,
        lastError: webhookInfo.last_error_message || null,
        lastErrorDate: webhookInfo.last_error_date
          ? new Date(webhookInfo.last_error_date * 1000).toISOString()
          : null,
      };
    } catch (error) {
      return {
        isInitialized: this.isInitialized,
        error: error.message,
      };
    }
  }

  /**
   * Generar código de vinculación único
   */
  private generateLinkCode(telegramUserId: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos (0,O,I,1,L)
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Añadir hash parcial del telegram ID para mayor seguridad
    const hash = telegramUserId.slice(-2);
    return `${code}${hash}`;
  }

  /**
   * Force reconfigure webhook (useful for debugging)
   */
  async forceReconfigureWebhook() {
    const appUrl = this.config.get<string>('APP_URL');
    if (!appUrl) {
      return { success: false, error: 'APP_URL not configured' };
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`;

    try {
      await this.bot.telegram.setWebhook(webhookUrl, {
        allowed_updates: ['message', 'callback_query', 'my_chat_member', 'chat_join_request'],
        drop_pending_updates: false,
        max_connections: 40,
      });

      const webhookInfo = await this.bot.telegram.getWebhookInfo();
      return {
        success: true,
        webhookUrl: webhookInfo.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * NUEVO: Guardar canal detectado (cuando el bot es añadido como admin)
   */
  private async saveDetectedChannel(
    channelId: string,
    channelTitle: string,
    channelUsername?: string,
    channelType?: string,
    addedByTelegramId?: string | null,
    addedByUsername?: string | null,
  ) {
    try {
      const now = new Date().toISOString();

      // Crear un nuevo invite link con JOIN REQUEST para el canal
      let inviteLink: string | null = null;
      try {
        if (this.httpService) {
          // Crear un enlace de invitación que REQUIERE APROBACIÓN
          const inviteResult = await this.httpService.createChatInviteLink(channelId, {
            createsJoinRequest: true,
            name: `Channel-${Date.now()}`,
          });
          inviteLink = inviteResult.invite_link;
          this.logger.log(`📎 Created join request link for channel ${channelTitle}: ${inviteLink}`);
        }
      } catch (inviteError) {
        this.logger.warn(`Could not create invite link for ${channelTitle}: ${inviteError.message}`);
        // Fallback: intentar obtener el link principal
        try {
          inviteLink = await this.httpService.exportChatInviteLink(channelId);
          this.logger.log(`📎 Fallback: Got primary invite link for channel ${channelTitle}: ${inviteLink}`);
        } catch (e) {
          this.logger.warn(`Also failed to get primary link: ${e.message}`);
        }
      }

      // Verificar si ya existe
      const existingResult = (await this.prisma.$runCommandRaw({
        find: 'detected_telegram_channels',
        filter: { channel_id: channelId },
        limit: 1,
      })) as any;

      const existing = existingResult.cursor?.firstBatch?.[0];

      if (existing) {
        // Actualizar el registro existente
        const updateData: any = {
          channel_title: channelTitle,
          channel_username: channelUsername || null,
          channel_type: channelType || 'channel',
          last_seen_at: { $date: now },
          is_active: true,
        };

        // Solo actualizar invite_link si se obtuvo uno nuevo
        if (inviteLink) {
          updateData.invite_link = inviteLink;
        }

        // Si tenemos el ID del usuario que añadió el bot, actualizarlo
        if (addedByTelegramId) {
          updateData.added_by_telegram_id = addedByTelegramId;
          updateData.added_by_username = addedByUsername || null;
        }

        await this.prisma.$runCommandRaw({
          update: 'detected_telegram_channels',
          updates: [
            {
              q: { channel_id: channelId },
              u: { $set: updateData },
            },
          ],
        });
        this.logger.log(`📝 Updated detected channel: ${channelTitle} (${channelId}) - addedBy: ${addedByTelegramId || 'unknown'}`);
      } else {
        // Crear nuevo registro
        const newDoc: any = {
          channel_id: channelId,
          channel_title: channelTitle,
          channel_username: channelUsername || null,
          channel_type: channelType || 'channel',
          detected_at: { $date: now },
          last_seen_at: { $date: now },
          is_active: true,
        };

        if (inviteLink) {
          newDoc.invite_link = inviteLink;
        }

        // Guardar quién añadió el bot
        if (addedByTelegramId) {
          newDoc.added_by_telegram_id = addedByTelegramId;
          newDoc.added_by_username = addedByUsername || null;
        }

        await this.prisma.$runCommandRaw({
          insert: 'detected_telegram_channels',
          documents: [newDoc],
        });
        this.logger.log(
          `✅ Saved new detected channel: ${channelTitle} (${channelId})${inviteLink ? ' with invite link' : ''} - addedBy: ${addedByTelegramId || 'unknown'}`,
        );
      }
    } catch (error) {
      this.logger.error('Error saving detected channel:', error);
    }
  }

  /**
   * NUEVO: Marcar canal como inactivo cuando el bot es removido
   */
  private async markChannelAsInactive(channelId: string) {
    try {
      const now = new Date().toISOString();

      await this.prisma.$runCommandRaw({
        update: 'detected_telegram_channels',
        updates: [
          {
            q: { channel_id: channelId },
            u: {
              $set: {
                is_active: false,
                last_seen_at: { $date: now },
              },
            },
          },
        ],
      });
      this.logger.log(`🚫 Marked channel ${channelId} as inactive`);
    } catch (error) {
      this.logger.error('Error marking channel as inactive:', error);
    }
  }

  /**
   * Marcar canales conectados como desconectados cuando el bot es removido
   */
  private async markConnectedChannelAsDisconnected(channelId: string) {
    try {
      const now = new Date().toISOString();

      // Marcar todos los telegram_channels con este channel_id como inactivos
      const result = await this.prisma.$runCommandRaw({
        update: 'telegram_channels',
        updates: [
          {
            q: { channel_id: channelId, is_active: true },
            u: {
              $set: {
                is_active: false,
                disconnected_at: { $date: now },
                disconnected_reason: 'bot_removed',
                updated_at: { $date: now },
              },
            },
            multi: true,
          },
        ],
      }) as any;

      const modifiedCount = result.nModified || 0;
      if (modifiedCount > 0) {
        this.logger.log(`🔌 Disconnected ${modifiedCount} connected channel(s) for channel_id ${channelId}`);
      }
    } catch (error) {
      this.logger.error('Error marking connected channels as disconnected:', error);
    }
  }

  /**
   * Intentar auto-conectar un canal si el usuario ya está vinculado a un tipster
   */
  private async tryAutoConnectChannel(
    channelId: string,
    channelTitle: string,
    channelUsername?: string,
    addedByTelegramId?: string | null,
  ) {
    if (!addedByTelegramId) {
      this.logger.log(`Cannot auto-connect: no addedByTelegramId for channel ${channelTitle}`);
      return;
    }

    try {
      // Buscar TODOS los tipsters aprobados con este telegram_user_id
      // Esto permite que si un usuario tiene múltiples cuentas de tipster,
      // los canales se conecten a TODAS las cuentas
      const tipsterResult = (await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { 
          telegram_user_id: addedByTelegramId,
          application_status: 'APPROVED'  // Solo tipsters aprobados
        },
      })) as any;

      const tipsters = tipsterResult.cursor?.firstBatch || [];

      if (tipsters.length === 0) {
        this.logger.log(`No approved tipsters found with telegram_user_id ${addedByTelegramId} - channel will be available when they connect`);
        return;
      }

      this.logger.log(`Found ${tipsters.length} tipster(s) for auto-connect with telegram_user_id: ${addedByTelegramId}`);

      // Conectar el canal a TODOS los tipsters encontrados
      for (const tipster of tipsters) {
        const tipsterId = tipster._id?.$oid || tipster._id;
        this.logger.log(`Auto-connecting channel to tipster: ${tipster.public_name} (${tipsterId})`);

        // Verificar si el canal ya está conectado para este tipster
        const existingChannel = await this.prisma.telegramChannel.findFirst({
          where: {
            tipsterId,
            channelId,
          },
        });

      if (existingChannel) {
        // Si existe pero está inactivo, reactivarlo
        if (!existingChannel.isActive) {
          const now = new Date().toISOString();
          await this.prisma.$runCommandRaw({
            update: 'telegram_channels',
            updates: [
              {
                q: { _id: { $oid: existingChannel.id } },
                u: {
                  $set: {
                    is_active: true,
                    channel_title: channelTitle,
                    updated_at: { $date: now },
                  },
                },
              },
            ],
          });
          this.logger.log(`✅ Reactivated channel ${channelTitle} for tipster ${tipsterId}`);
        } else {
          this.logger.log(`Channel ${channelTitle} already connected to tipster ${tipsterId}`);
        }
        continue; // Continuar con el siguiente tipster
      }

      // Crear invite link con JOIN REQUEST (solo una vez, para el primer tipster)
      let inviteLink: string | null = null;
      try {
        if (this.httpService) {
          // Crear un enlace de invitación que REQUIERE APROBACIÓN
          const inviteResult = await this.httpService.createChatInviteLink(channelId, {
            createsJoinRequest: true,
            name: `AutoConnect-${Date.now()}`,
          });
          inviteLink = inviteResult.invite_link;
          this.logger.log(`📎 Created join request link for auto-connect: ${inviteLink}`);
        }
      } catch (e) {
        this.logger.warn(`Could not create invite link for auto-connect: ${e.message}`);
        // Fallback: intentar obtener el link principal
        try {
          inviteLink = await this.httpService.exportChatInviteLink(channelId);
        } catch (e2) {
          this.logger.warn(`Also failed to get primary link: ${e2.message}`);
        }
      }

      // Crear el canal automáticamente
      const now = new Date().toISOString();
      const isPrivate = !channelUsername;

      await this.prisma.$runCommandRaw({
        insert: 'telegram_channels',
        documents: [
          {
            tipster_id: tipsterId,
            channel_id: channelId,
            channel_name: channelUsername ? `@${channelUsername}` : null,
            channel_title: channelTitle,
            channel_type: isPrivate ? 'private' : 'public',
            invite_link: inviteLink || null,
            member_count: null,
            is_active: true,
            connected_at: { $date: now },
            created_at: { $date: now },
            updated_at: { $date: now },
            connection_type: 'auto',
          },
        ],
      });

      // Marcar el canal detectado como auto-conectado (al primer tipster)
      await this.prisma.$runCommandRaw({
        update: 'detected_telegram_channels',
        updates: [
          {
            q: { channel_id: channelId },
            u: { $set: { auto_connected_to: tipsterId } },
          },
        ],
      });

      this.logger.log(`🎉 AUTO-CONNECTED channel ${channelTitle} to tipster ${tipster.public_name || tipsterId}`);
      } // Fin del for loop

      // Enviar mensaje de confirmación al canal (solo una vez)
      if (tipsters.length > 0) {
        const tipsterNames = tipsters.map(t => t.public_name || 'cuenta').join(', ');
        try {
          await this.httpService.sendMessage(
            channelId,
            `✅ *¡Canal conectado automáticamente!*\n\n` +
              `Este canal ha sido vinculado a *${tipsterNames}* en la plataforma.\n\n` +
              `Ahora puedes:\n` +
              `• Asociar productos a este canal\n` +
              `• Dar acceso automático a clientes que compren\n` +
              `• Publicar tus pronósticos`,
            { parseMode: 'Markdown' },
          );
        } catch (msgError) {
          this.logger.warn(`Could not send welcome message to channel: ${msgError.message}`);
        }
      }

    } catch (error) {
      this.logger.error('Error in tryAutoConnectChannel:', error);
    }
  }

  /**
   * NUEVO: Buscar canal por nombre (para conectar sin pedir ID)
   * Busca en la tabla de canales detectados
   * OPTIMIZADO: No hace verificación con Telegram para evitar timeouts
   */
  async findChannelByName(channelName: string, inviteLink?: string): Promise<{
    found: boolean;
    channel?: {
      channelId: string;
      channelTitle: string;
      channelUsername?: string;
      channelType: string;
    };
    error?: string;
  }> {
    try {
      // Normalizar el nombre para búsqueda (case-insensitive)
      const normalizedName = channelName.trim();

      // Buscar por título exacto o username (sin @)
      const searchName = normalizedName.replace(/^@/, '');

      // PASO 1: Buscar en la base de datos
      let result = (await this.prisma.$runCommandRaw({
        find: 'detected_telegram_channels',
        filter: {
          is_active: true,
          $or: [
            { channel_title: { $regex: `^${this.escapeRegex(normalizedName)}$`, $options: 'i' } },
            { channel_username: { $regex: `^${this.escapeRegex(searchName)}$`, $options: 'i' } },
          ],
        },
      })) as any;

      let channels = result.cursor?.firstBatch || [];

      // PASO 2: Si no se encontró, forzar refresh de updates de Telegram
      if (channels.length === 0) {
        this.logger.log(`🔄 Canal "${normalizedName}" no encontrado en DB, forzando refresh de updates...`);
        
        try {
          // Temporalmente desactivar webhook para hacer getUpdates
          await this.httpService.deleteWebhook(false);
          
          // Obtener todos los updates pendientes
          const updates = await this.httpService.getUpdates({
            timeout: 5,
            allowedUpdates: ['my_chat_member', 'channel_post'],
          });
          
          this.logger.log(`📥 Got ${updates?.length || 0} updates from Telegram`);
          
          // Procesar cada update
          if (updates && Array.isArray(updates)) {
            for (const update of updates) {
              if (update.my_chat_member) {
                await this.handleMyChatMemberUpdate(update.my_chat_member);
              }
              if (update.channel_post) {
                const chat = update.channel_post.chat;
                if (chat && chat.type === 'channel') {
                  this.logger.log(`📬 Found channel from update: ${chat.title} (${chat.id})`);
                  await this.saveDetectedChannel(chat.id.toString(), chat.title, chat.username, chat.type);
                }
              }
            }
          }
          
          // Restaurar webhook
          const appUrl = this.config.get<string>('APP_URL');
          if (appUrl) {
            await this.httpService.setWebhook(`${appUrl}/api/telegram/webhook`, {
              allowedUpdates: ['message', 'callback_query', 'my_chat_member', 'chat_join_request', 'channel_post'],
            });
          }
          
          // Buscar de nuevo en la base de datos
          result = (await this.prisma.$runCommandRaw({
            find: 'detected_telegram_channels',
            filter: {
              is_active: true,
              $or: [
                { channel_title: { $regex: `^${this.escapeRegex(normalizedName)}$`, $options: 'i' } },
                { channel_username: { $regex: `^${this.escapeRegex(searchName)}$`, $options: 'i' } },
              ],
            },
          })) as any;
          
          channels = result.cursor?.firstBatch || [];
          
          if (channels.length > 0) {
            this.logger.log(`✅ Canal(es) encontrado(s) después del refresh: ${channels.length}`);
          }
        } catch (refreshError) {
          this.logger.warn('Error during refresh:', refreshError.message);
        }
      }

      // PASO 3: Si hay múltiples canales con el mismo nombre, usar el link para diferenciar
      let channel = null;
      
      if (channels.length === 0) {
        // No se encontró ningún canal
        const availableResult = (await this.prisma.$runCommandRaw({
          find: 'detected_telegram_channels',
          filter: { is_active: true },
        })) as any;
        const availableChannels = availableResult.cursor?.firstBatch || [];
        const channelNames = availableChannels.map((c: any) => c.channel_title).join(', ');
        
        return {
          found: false,
          error: `Canal "${normalizedName}" no encontrado.\n\nCanales detectados: ${channelNames || 'Ninguno'}\n\n💡 Para detectar tu canal:\n1. Verifica que @Antiabetbot sea admin\n2. Envía un mensaje en el canal\n3. Vuelve a intentar`,
        };
      } else if (channels.length === 1) {
        // Solo hay un canal con ese nombre
        channel = channels[0];
      } else {
        // Hay múltiples canales con el mismo nombre
        this.logger.log(`⚠️ Se encontraron ${channels.length} canales con el nombre "${normalizedName}"`);
        
        if (inviteLink) {
          // Extraer el hash del link proporcionado
          const hashMatch = inviteLink.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
          const searchHash = hashMatch ? hashMatch[1] : null;
          
          if (searchHash) {
            // Buscar el canal que coincida con el invite link
            for (const ch of channels) {
              // Comparar con el invite_link guardado
              if (ch.invite_link) {
                const chHashMatch = ch.invite_link.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
                const chHash = chHashMatch ? chHashMatch[1] : null;
                if (chHash && (chHash === searchHash || searchHash.includes(chHash) || chHash.includes(searchHash))) {
                  channel = ch;
                  this.logger.log(`✅ Canal diferenciado por invite link: ${ch.channel_title}`);
                  break;
                }
              }
              
              // También intentar exportar el link actual del canal para comparar
              if (!channel) {
                try {
                  const currentLink = await this.httpService.exportChatInviteLink(ch.channel_id);
                  if (currentLink) {
                    const currentHashMatch = currentLink.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
                    const currentHash = currentHashMatch ? currentHashMatch[1] : null;
                    if (currentHash && (currentHash === searchHash || searchHash.includes(currentHash) || currentHash.includes(searchHash))) {
                      channel = ch;
                      
                      // Guardar el invite link para futuras búsquedas
                      await this.prisma.$runCommandRaw({
                        update: 'detected_telegram_channels',
                        updates: [{ q: { channel_id: ch.channel_id }, u: { $set: { invite_link: currentLink } } }],
                      });
                      
                      this.logger.log(`✅ Canal diferenciado por API invite link: ${ch.channel_title}`);
                      break;
                    }
                  }
                } catch (e) {
                  // Ignorar errores de API
                }
              }
            }
          }
        }
        
        // Si no se pudo diferenciar por link, devolver error pidiendo el link
        if (!channel) {
          const channelList = channels.map((c: any) => `• ${c.channel_title} (ID: ${c.channel_id})`).join('\n');
          return {
            found: false,
            error: `Se encontraron ${channels.length} canales con el nombre "${normalizedName}":\n${channelList}\n\n💡 Por favor, proporciona el link de invitación para diferenciarlos.`,
          };
        }
      }

      return {
        found: true,
        channel: {
          channelId: channel.channel_id,
          channelTitle: channel.channel_title,
          channelUsername: channel.channel_username || undefined,
          channelType: channel.channel_type,
        },
      };
    } catch (error) {
      this.logger.error('Error finding channel by name:', error);
      return {
        found: false,
        error: 'Error al buscar el canal. Por favor, intenta de nuevo.',
      };
    }
  }

  /**
   * Escapar caracteres especiales para regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * NUEVO: Buscar canal por invite link
   * Soporta formatos:
   * - https://t.me/+abc123xyz
   * - t.me/+abc123xyz
   * - https://t.me/joinchat/abc123xyz (formato antiguo)
   * - https://t.me/channelname (canales públicos)
   *
   * NOTA: Si no encuentra por link guardado, busca por título del canal
   */
  async findChannelByInviteLink(inviteLink: string): Promise<{
    found: boolean;
    channel?: {
      channelId: string;
      channelTitle: string;
      channelUsername?: string;
      channelType: string;
    };
    error?: string;
    availableChannels?: Array<{ id: string; title: string }>;
  }> {
    try {
      const link = inviteLink.trim();

      // Extraer el hash o username del link
      let searchPattern: string | null = null;
      let isPublicChannel = false;

      // Formato: t.me/+HASH o https://t.me/+HASH
      const plusMatch = link.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
      if (plusMatch) {
        searchPattern = plusMatch[1];
      }

      // Formato antiguo: t.me/joinchat/HASH
      if (!searchPattern) {
        const joinchatMatch = link.match(/t\.me\/joinchat\/([a-zA-Z0-9_-]+)/);
        if (joinchatMatch) {
          searchPattern = joinchatMatch[1];
        }
      }

      // Formato público: t.me/USERNAME
      if (!searchPattern) {
        const usernameMatch = link.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,})/);
        if (usernameMatch && !usernameMatch[1].startsWith('+')) {
          searchPattern = usernameMatch[1];
          isPublicChannel = true;
        }
      }

      if (!searchPattern) {
        return {
          found: false,
          error:
            'Formato de link no válido. Usa el link de invitación de tu canal (ej: https://t.me/+abc123)',
        };
      }

      // PASO 0: Forzar refresh de updates de Telegram para detectar canales nuevos
      this.logger.log(`🔄 Forcing Telegram updates refresh before searching for channel...`);
      try {
        if (this.httpService) {
          const updates = await this.httpService.getUpdates({
            timeout: 5,
            allowedUpdates: ['my_chat_member'],
          });
          
          if (updates && Array.isArray(updates) && updates.length > 0) {
            this.logger.log(`📥 Got ${updates.length} updates from Telegram`);
            for (const update of updates) {
              if (update.my_chat_member) {
                await this.handleMyChatMemberUpdate(update.my_chat_member);
              }
            }
          }
        }
      } catch (refreshError) {
        this.logger.warn('Could not refresh updates:', refreshError.message);
      }

      // PASO 1: Buscar por invite link en la base de datos
      let filter: any;

      if (isPublicChannel) {
        filter = {
          is_active: true,
          channel_username: { $regex: `^${this.escapeRegex(searchPattern)}$`, $options: 'i' },
        };
      } else {
        filter = {
          is_active: true,
          $or: [
            { invite_link: { $regex: searchPattern, $options: 'i' } },
            { invite_link: { $regex: `\\+${searchPattern}`, $options: 'i' } },
            { invite_link: { $regex: `joinchat/${searchPattern}`, $options: 'i' } },
            { primary_invite_link: { $regex: searchPattern, $options: 'i' } },
          ],
        };
      }

      const result = (await this.prisma.$runCommandRaw({
        find: 'detected_telegram_channels',
        filter,
        limit: 1,
      })) as any;

      let channel = result.cursor?.firstBatch?.[0];

      // PASO 2: Si no encontró, intentar verificar con la API de Telegram
      // Obtenemos todos los canales activos y verificamos si el link coincide
      if (!channel && !isPublicChannel) {
        this.logger.log(`Link not found in DB, checking all channels for match...`);

        // Obtener todos los canales detectados
        const allChannelsResult = (await this.prisma.$runCommandRaw({
          find: 'detected_telegram_channels',
          filter: { is_active: true },
        })) as any;

        const allChannels = allChannelsResult.cursor?.firstBatch || [];

        // Para cada canal, intentar obtener su invite link actual y comparar
        for (const ch of allChannels) {
          try {
            // Generar nuevo invite link para comparar
            if (this.httpService) {
              const currentLink = await this.httpService.exportChatInviteLink(ch.channel_id);

              // Extraer hash del link actual
              const currentMatch = currentLink?.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
              const currentHash = currentMatch ? currentMatch[1] : null;

              // Si el hash coincide (comparación completa o parcial), encontramos el canal
              const hashMatches = currentHash && (
                currentHash === searchPattern ||
                searchPattern === currentHash ||
                currentHash.startsWith(searchPattern) ||
                searchPattern.startsWith(currentHash)
              );
              
              if (hashMatches) {
                channel = ch;

                // Actualizar el invite link en la base de datos
                await this.prisma.$runCommandRaw({
                  update: 'detected_telegram_channels',
                  updates: [
                    {
                      q: { channel_id: ch.channel_id },
                      u: {
                        $set: {
                          invite_link: currentLink,
                          primary_invite_link: link,
                        },
                      },
                    },
                  ],
                });

                this.logger.log(`✅ Found channel by invite link match: ${ch.channel_title}`);
                break;
              }
            }
          } catch (err) {
            // Ignorar errores de canales individuales
            continue;
          }
        }
      }

      if (!channel) {
        // PASO 3: Si no se encontró, guardar el invite link como pendiente
        // para que cuando llegue el evento my_chat_member, se conecte automáticamente
        this.logger.log(`📝 Saving pending invite link for future detection: ${link}`);
        
        try {
          await this.prisma.$runCommandRaw({
            update: 'pending_channel_connections',
            updates: [
              {
                q: { invite_link: link },
                u: {
                  $set: {
                    invite_link: link,
                    search_pattern: searchPattern,
                    requested_at: { $date: new Date().toISOString() },
                  },
                },
                upsert: true,
              },
            ],
          });
        } catch (saveError) {
          this.logger.warn('Could not save pending invite link:', saveError);
        }

        // Mostrar canales disponibles con instrucciones claras
        const availableResult = (await this.prisma.$runCommandRaw({
          find: 'detected_telegram_channels',
          filter: { is_active: true },
        })) as any;

        const availableChannels = availableResult.cursor?.firstBatch || [];
        const channelNames = availableChannels.map((c: any) => c.channel_title).join(', ');

        return {
          found: false,
          error: `⚠️ Canal no encontrado con ese link.\n\n📋 Canales donde el bot es admin:\n${channelNames || 'Ninguno'}\n\n🔧 SOLUCIÓN:\n1. Ve a tu canal de Telegram\n2. Envía cualquier mensaje (ej: "test")\n3. Vuelve aquí e intenta conectar de nuevo\n\nEsto es necesario para que el bot detecte tu canal.\n\n💡 Alternativa: Usa "Por Channel ID" y obtén el ID con @userinfobot`,
          availableChannels: availableChannels.map((c: any) => ({
            id: c.channel_id,
            title: c.channel_title,
          })),
        };
      }

      return {
        found: true,
        channel: {
          channelId: channel.channel_id,
          channelTitle: channel.channel_title,
          channelUsername: channel.channel_username || undefined,
          channelType: channel.channel_type,
        },
      };
    } catch (error) {
      this.logger.error('Error finding channel by invite link:', error);
      return {
        found: false,
        error: 'Error al buscar el canal. Por favor, intenta de nuevo.',
      };
    }
  }

  /**
   * NUEVO: Conectar canal por nombre (método simplificado)
   */
  async connectChannelByName(
    tipsterId: string,
    channelName: string,
  ): Promise<{ success: boolean; message: string; channelInfo?: any }> {
    // Buscar el canal por nombre
    const searchResult = await this.findChannelByName(channelName);

    if (!searchResult.found || !searchResult.channel) {
      return {
        success: false,
        message: searchResult.error || 'Canal no encontrado',
      };
    }

    // Usar el método existente para conectar por ID
    return this.connectChannelManually(tipsterId, searchResult.channel.channelId);
  }

  /**
   * NUEVO: Verificar y registrar canal por ID
   * Útil cuando el evento my_chat_member no se recibió
   */
  async verifyAndRegisterChannelById(channelId: string): Promise<{
    success: boolean;
    channel?: {
      channelId: string;
      channelTitle: string;
      channelUsername?: string;
      channelType: string;
    };
    error?: string;
  }> {
    try {
      if (!this.bot) {
        return { success: false, error: 'Bot no inicializado' };
      }

      // Intentar obtener información del canal
      const chat = await this.bot.telegram.getChat(channelId);

      if (chat.type !== 'channel' && chat.type !== 'supergroup') {
        return { success: false, error: 'El ID no corresponde a un canal o grupo' };
      }

      // Verificar que el bot es admin
      const botInfo = await this.bot.telegram.getMe();
      const botMember = await this.bot.telegram.getChatMember(channelId, botInfo.id);

      if (botMember.status !== 'administrator' && botMember.status !== 'creator') {
        return {
          success: false,
          error: 'El bot no es administrador de este canal. Añádelo como admin primero.',
        };
      }

      // Guardar en la base de datos
      const chatTitle = 'title' in chat ? chat.title : 'Canal sin nombre';
      const chatUsername = 'username' in chat ? chat.username : undefined;

      await this.saveDetectedChannel(channelId, chatTitle, chatUsername, chat.type);

      this.logger.log(`✅ Canal verificado y registrado: ${chatTitle} (${channelId})`);

      return {
        success: true,
        channel: {
          channelId: channelId,
          channelTitle: chatTitle,
          channelUsername: chatUsername,
          channelType: chat.type,
        },
      };
    } catch (error: any) {
      this.logger.error('Error verifying channel by ID:', error);

      if (error.message?.includes('chat not found')) {
        return { success: false, error: 'Canal no encontrado. Verifica que el ID sea correcto.' };
      }
      if (error.message?.includes('bot was kicked') || error.message?.includes('not a member')) {
        return { success: false, error: 'El bot no tiene acceso a este canal.' };
      }

      return { success: false, error: 'Error al verificar el canal. Intenta de nuevo.' };
    }
  }

  /**
   * NUEVO: Conectar canal por ID (verificando que el bot sea admin)
   */
  async connectChannelById(
    tipsterId: string,
    channelId: string,
  ): Promise<{ success: boolean; message: string; channelInfo?: any }> {
    // Primero verificar y registrar el canal
    const verifyResult = await this.verifyAndRegisterChannelById(channelId);

    if (!verifyResult.success || !verifyResult.channel) {
      return {
        success: false,
        message: verifyResult.error || 'No se pudo verificar el canal',
      };
    }

    // Ahora conectar usando el método existente
    return this.connectChannelManually(tipsterId, channelId);
  }

  /**
   * Save a message to the monitored messages collection
   * Only saves if the channel is being actively monitored
   */
  private async saveMonitoredMessage(message: any, chat: any): Promise<void> {
    try {
      const channelId = chat.id.toString();
      
      // Check if this channel is being monitored
      const monitorConfig = await this.prisma.channelMonitorConfig.findFirst({
        where: { channelId },
        select: { isMonitoring: true, id: true },
      });

      if (!monitorConfig?.isMonitoring) {
        return; // Not monitored, skip
      }

      // Determine message type
      let messageType = 'text';
      let textContent = message.text || null;
      let caption = message.caption || null;

      if (message.photo) messageType = 'photo';
      else if (message.video) messageType = 'video';
      else if (message.document) messageType = 'document';
      else if (message.audio) messageType = 'audio';
      else if (message.voice) messageType = 'voice';
      else if (message.sticker) messageType = 'sticker';
      else if (message.animation) messageType = 'animation';
      else if (message.video_note) messageType = 'video_note';
      else if (message.location) messageType = 'location';
      else if (message.contact) messageType = 'contact';
      else if (message.poll) messageType = 'poll';

      // Get sender info (from for groups, sender_chat for channels)
      const sender = message.from || message.sender_chat;
      const senderUserId = sender?.id?.toString() || null;
      const senderUsername = sender?.username || null;
      const senderFirstName = sender?.first_name || sender?.title || null;
      const senderLastName = sender?.last_name || null;

      // Check for duplicate
      const existing = await this.prisma.channelMessage.findFirst({
        where: {
          channelId,
          messageId: message.message_id,
        },
      });

      if (existing) {
        return; // Already saved
      }

      // Save the message
      await this.prisma.channelMessage.create({
        data: {
          channelId,
          channelTitle: chat.title || null,
          messageId: message.message_id,
          senderUserId,
          senderUsername,
          senderFirstName,
          senderLastName,
          messageType,
          textContent,
          caption,
          replyToMessageId: message.reply_to_message?.message_id || null,
          forwardFromId: message.forward_from?.id?.toString() || message.forward_from_chat?.id?.toString() || null,
          telegramDate: new Date(message.date * 1000),
        },
      });

      // Update message count
      await this.prisma.channelMonitorConfig.update({
        where: { channelId },
        data: { messageCount: { increment: 1 } },
      });

      this.logger.debug(`💬 Monitored message saved: ${message.message_id} from ${chat.title}`);
    } catch (error) {
      // Log but don't throw - monitoring should not interrupt normal operation
      this.logger.warn(`Error saving monitored message: ${error.message}`);
    }
  }
}
