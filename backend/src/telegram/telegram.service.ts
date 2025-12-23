import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(TelegramService.name);
  private isInitialized = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
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
    if (!this.bot) {
      this.logger.warn('Telegram bot not initialized - skipping');
      return;
    }
    
    try {
      // Obtener info del bot with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Telegram connection timeout')), 10000)
      );
      
      const botInfoPromise = this.bot.telegram.getMe();
      const botInfo = await Promise.race([botInfoPromise, timeoutPromise]) as any;
      this.logger.log(`📱 Bot info: @${botInfo.username}`);
      
      // Usar polling en lugar de webhook para evitar problemas de proxy/ingress
      this.logger.log(`🔧 Removing any existing webhook and starting polling mode...`);
      
      // Eliminar webhook existente
      await this.bot.telegram.deleteWebhook({ drop_pending_updates: false });
      this.logger.log(`✅ Webhook removed`);
      
      // Iniciar polling en background (no bloqueante)
      // Note: launch() nunca resuelve normalmente - mantiene el polling activo
      this.bot.launch({
        allowedUpdates: ['message', 'callback_query', 'my_chat_member', 'chat_join_request'],
      }).catch((err) => {
        this.logger.error('Bot polling error:', err.message);
      });
      
      this.isInitialized = true;
      this.logger.log('✅ TelegramService initialized (polling mode - running in background)');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot:', error.message);
      this.logger.warn('⚠️  Telegram features may not work correctly - continuing without Telegram');
      // Don't throw - let the app continue without Telegram
    }
  }

  async onModuleDestroy() {
    if (this.bot && this.isInitialized) {
      this.logger.log('🛑 Stopping Telegram bot...');
      this.bot.stop('App shutdown');
      this.logger.log('✅ Telegram bot stopped');
    }
  }

  private setupBot() {
    if (!this.bot) return;
    
    // Handler cuando el bot es añadido a un canal
    this.bot.on('my_chat_member', async (ctx) => {
      try {
        const { chat, new_chat_member } = ctx.myChatMember;
        
        // Verificar si el bot fue añadido como administrador
        if (
          new_chat_member.status === 'administrator' &&
          (chat.type === 'channel' || chat.type === 'supergroup')
        ) {
          this.logger.log(`🎉 Bot added to channel: ${chat.title} (${chat.id})`);
          await this.handleChannelConnection(chat.id.toString(), chat.title, chat.username);
        }
      } catch (error) {
        this.logger.error('Error handling my_chat_member:', error);
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
        
        // NUEVO FLUJO: Si viene con order_, validar pago y dar acceso
        if (startPayload && startPayload.startsWith('order_')) {
          const orderId = startPayload.replace('order_', '');
          this.logger.log(`🎯 Post-payment flow for order: ${orderId}`);
          await this.handlePostPaymentAccess(ctx, orderId, telegramUserId);
          return;
        }

        // LEGACY: Si viene con product_, redirigir al checkout web
        if (startPayload && startPayload.startsWith('product_')) {
          const productId = startPayload.replace('product_', '');
          this.logger.log(`🔄 Redirecting to web checkout for product: ${productId}`);
          
          const appUrl = this.config.get('APP_URL');
          const checkoutUrl = `${appUrl}/checkout/${productId}`;
          
          await ctx.reply(
            '👋 ¡Bienvenido a Antia!\n\n' +
            '💳 Para completar tu compra, haz clic en el botón de abajo:\n\n' +
            '_Serás redirigido a nuestra página de pago seguro._',
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💳 Ir al Checkout', url: checkoutUrl }],
                ],
              },
            }
          );
          return;
        }

        // Sin payload válido - mensaje de bienvenida simple
        await ctx.reply(
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
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        this.logger.error('Error in /start command:', error);
        await ctx.reply('Hubo un error. Por favor, intenta nuevamente.');
      }
    });

    // Command /info para obtener información del chat (útil para tipsters)
    this.bot.command('info', async (ctx) => {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const chatTitle = 'title' in ctx.chat ? ctx.chat.title : 'N/A';
      const chatUsername = 'username' in ctx.chat ? ctx.chat.username : 'N/A';
      
      await ctx.reply(`
📊 **Información del Chat**

🆔 Chat ID: \`${chatId}\`
📝 Tipo: ${chatType}
🏷️ Título: ${chatTitle}
👤 Username: @${chatUsername}
      `, { parse_mode: 'Markdown' });
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
          { parse_mode: 'Markdown' }
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

      // Buscar la orden
      const orderResult = await this.prisma.$runCommandRaw({
        find: 'orders',
        filter: { _id: { $oid: orderId } },
        limit: 1,
      }) as any;

      const order = orderResult.cursor?.firstBatch?.[0];

      if (!order) {
        this.logger.warn(`❌ Order ${orderId} not found`);
        await ctx.reply(
          '❌ *Orden no encontrada*\n\n' +
          'No pudimos encontrar tu compra. Si crees que es un error, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Verificar que el pago está completado
      if (order.status !== 'PAGADA' && order.status !== 'COMPLETED' && order.status !== 'paid') {
        this.logger.warn(`❌ Order ${orderId} not paid. Status: ${order.status}`);
        await ctx.reply(
          '⏳ *Pago pendiente*\n\n' +
          `Estado actual: ${order.status}\n\n` +
          'Tu pago aún no ha sido confirmado. Si ya pagaste, espera unos momentos e intenta de nuevo.\n\n' +
          'Si el problema persiste, contacta con @AntiaSupport',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Actualizar la orden con el telegramUserId del cliente
      await this.prisma.$runCommandRaw({
        update: 'orders',
        updates: [{
          q: { _id: { $oid: orderId } },
          u: {
            $set: {
              telegram_user_id: telegramUserId,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        }],
      });

      // Obtener producto
      const product: any = await this.prisma.product.findUnique({
        where: { id: order.product_id },
      });

      if (!product) {
        await ctx.reply('❌ Producto no encontrado. Contacta con @AntiaSupport');
        return;
      }

      // Obtener tipster
      const tipster: any = await this.prisma.tipsterProfile.findUnique({
        where: { id: product.tipsterId },
      });

      // Buscar el canal asociado al producto
      let channelLink: string | null = null;
      let channelTitle: string = product.title;
      let channelId: string | null = null;

      if (product.telegramChannelId) {
        const channelResult = await this.prisma.$runCommandRaw({
          find: 'telegram_channels',
          filter: { 
            channel_id: product.telegramChannelId,
            tipster_id: tipster?.id,
            is_active: true,
          },
          projection: { invite_link: 1, channel_title: 1, channel_id: 1 },
          limit: 1,
        }) as any;

        const channel = channelResult.cursor?.firstBatch?.[0];
        if (channel) {
          channelLink = channel.invite_link;
          channelTitle = channel.channel_title || product.title;
          channelId = channel.channel_id;
          this.logger.log(`✅ Found channel: ${channelTitle} with link: ${channelLink}`);
        }
      }

      // Si no hay canal del producto, buscar legacy
      if (!channelLink && tipster) {
        const tipsterResult = await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { _id: { $oid: tipster.id } },
          projection: { premium_channel_link: 1 },
          limit: 1,
        }) as any;
        channelLink = tipsterResult.cursor?.firstBatch?.[0]?.premium_channel_link;
      }

      // Mensaje de confirmación
      await ctx.reply(
        `✅ *¡Pago verificado!*\n\n` +
        `Gracias por tu compra de *${product.title}*.\n\n` +
        `Tu acceso está listo.`,
        { parse_mode: 'Markdown' }
      );

      // Mostrar acceso al canal
      if (channelLink) {
        await ctx.reply(
          `🎯 *Acceso a tu canal*\n\n` +
          `Haz clic en el botón para unirte a *${channelTitle}*:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `🚀 Entrar a ${channelTitle}`, url: channelLink }],
              ],
            },
          }
        );

        // Guardar registro de acceso otorgado
        await this.prisma.$runCommandRaw({
          update: 'orders',
          updates: [{
            q: { _id: { $oid: orderId } },
            u: {
              $set: {
                access_granted: true,
                access_granted_at: { $date: new Date().toISOString() },
                channel_link_sent: channelLink,
              },
            },
          }],
        });

        this.logger.log(`✅ Access granted to user ${telegramUserId} for order ${orderId}`);
      } else {
        await ctx.reply(
          `ℹ️ *Acceso pendiente*\n\n` +
          `El tipster *${tipster?.publicName || 'desconocido'}* te contactará pronto con los detalles de acceso.\n\n` +
          `Si no recibes noticias en 24h, contacta con @AntiaSupport`,
          { parse_mode: 'Markdown' }
        );
      }

      // Notificar al tipster sobre la venta
      if (tipster) {
        await this.notifyTipsterNewSale(
          tipster.id,
          orderId,
          product.id,
          order.amount_cents || product.priceCents,
          order.currency || 'EUR',
          order.email_backup,
        );
      }

    } catch (error) {
      this.logger.error('Error in handlePostPaymentAccess:', error);
      await ctx.reply(
        '❌ Hubo un error al procesar tu acceso. Por favor, intenta de nuevo o contacta con @AntiaSupport'
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

      this.logger.log(`📥 Join request from user ${telegramUserId} to channel ${channelId}`);

      // Buscar si el usuario tiene una orden pagada para este canal
      const orderResult = await this.prisma.$runCommandRaw({
        find: 'orders',
        filter: {
          telegram_user_id: telegramUserId,
          status: { $in: ['PAGADA', 'COMPLETED', 'paid'] },
        },
        sort: { created_at: -1 },
        limit: 10,
      }) as any;

      const orders = orderResult.cursor?.firstBatch || [];

      // Verificar si alguna orden tiene acceso a este canal
      for (const order of orders) {
        const product: any = await this.prisma.product.findUnique({
          where: { id: order.product_id },
        });

        if (product && product.telegramChannelId === channelId) {
          // ¡Usuario autorizado! Aprobar solicitud
          try {
            await this.bot.telegram.approveChatJoinRequest(channelId, parseInt(telegramUserId));
            this.logger.log(`✅ Approved join request for user ${telegramUserId} to channel ${channelId}`);
            
            // Enviar mensaje privado de confirmación
            await this.bot.telegram.sendMessage(
              telegramUserId,
              `✅ *¡Bienvenido!*\n\n` +
              `Tu solicitud de unión a *${chat.title}* ha sido aprobada.\n\n` +
              `Disfruta del contenido premium 🎯`,
              { parse_mode: 'Markdown' }
            );
            return;
          } catch (approveError) {
            this.logger.error('Error approving join request:', approveError);
          }
        }
      }

      // Usuario no autorizado - rechazar o ignorar
      this.logger.warn(`❌ User ${telegramUserId} not authorized for channel ${channelId}`);
      
      // Opcional: Enviar mensaje de que necesita comprar
      try {
        await this.bot.telegram.sendMessage(
          telegramUserId,
          `❌ *Acceso denegado*\n\n` +
          `No tienes una compra válida para este canal.\n\n` +
          `Para obtener acceso, busca el enlace de compra en el canal público del tipster.`,
          { parse_mode: 'Markdown' }
        );
      } catch (msgError) {
        this.logger.warn('Could not send denial message:', msgError);
      }

    } catch (error) {
      this.logger.error('Error in handleJoinRequest:', error);
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
    const pendingResult = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { 
        publication_channel_pending: true,
      },
      projection: { 
        _id: 1, 
        public_name: 1,
        user_id: 1,
      },
    }) as any;

    const pendingTipsters = pendingResult.cursor?.firstBatch || [];
    
    if (pendingTipsters.length > 0) {
      // Vincular al primer tipster que está esperando (FIFO)
      const tipster = pendingTipsters[0];
      const tipsterId = tipster._id.$oid || tipster._id;
      
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [{
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
        }],
      });

      this.logger.log(`✅ Auto-configured publication channel for tipster: ${tipster.public_name}`);
      
      // Enviar mensaje de confirmación al canal
      await this.bot.telegram.sendMessage(
        channelId,
        `✅ *¡Canal de Publicación Configurado\\!*\n\n` +
        `Este canal ha sido vinculado como canal de publicación para *${this.escapeMarkdownV2(tipster.public_name || 'Tipster')}*\\.\n\n` +
        `Ahora puedes usar el botón "📱 Compartir" en tus productos para publicarlos aquí automáticamente\\.`,
        { parse_mode: 'MarkdownV2' }
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
          updates: [{
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
          }],
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
        botMember = await this.bot.telegram.getChatMember(
          chatInfo.id.toString(),
          botInfo.id,
        );
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
        updates: [{
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
        }],
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
        message: error.message || 'Error al conectar el canal. Verifica que el ID/username sea correcto y que el bot sea administrador.',
      };
    }
  }

  /**
   * Desconectar un canal
   */
  async disconnectChannel(tipsterId: string): Promise<void> {
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [{
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
      }],
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
    const {
      title,
      description,
      priceCents,
      currency,
      validityDays,
      id,
    } = product;

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
   * Enviar un mensaje simple
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, text);
    } catch (error) {
      this.logger.error(`Error sending message to ${chatId}:`, error);
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
        { parse_mode: 'Markdown' }
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
      await ctx.reply('Compra cancelada. Si cambias de opinión, vuelve a usar el link del producto.');
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
            [
              { text: '💳 Proceder al Pago', callback_data: `proceed_payment_${productId}` },
            ],
            [
              { text: '❌ Cancelar', callback_data: 'cancel_purchase' },
            ],
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
            inline_keyboard: [
              [
                { text: '💳 Ir a Pagar', url: checkoutUrl },
              ],
            ],
          },
        }
      );

      // Mensaje informativo
      await ctx.reply(
        `⏳ Una vez que completes el pago, regresa aquí.\n` +
        `Te notificaré automáticamente cuando el pago sea confirmado y te daré acceso al canal premium.`
      );

    } catch (error) {
      this.logger.error('Error generating checkout link:', error);
      await ctx.reply('Hubo un error al generar el link de pago. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Crear orden pendiente
   */
  private async createPendingOrder(productId: string, telegramUserId: string, username: string): Promise<string> {
    const orderId = this.generateOrderId();
    const now = new Date();

    // Guardar orden en base de datos
    await this.prisma.$runCommandRaw({
      insert: 'orders',
      documents: [{
        _id: orderId,
        product_id: productId,
        telegram_user_id: telegramUserId,
        telegram_username: username,
        status: 'PENDING',
        payment_method: null,
        amount_cents: null,
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
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
   * Notificar al cliente sobre pago exitoso
   */
  async notifyPaymentSuccess(telegramUserId: string, orderId: string, productId: string) {
    try {
      this.logger.log(`Processing payment success notification for user ${telegramUserId}, order ${orderId}`);

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

      // Mensaje 1: Agradecimiento y soporte
      const thankYouMessage = 
        `✅ *Gracias por su compra*\n\n` +
        `A continuación recibirá acceso a su servicio.\n\n` +
        `Si tiene alguna consulta, puede contactar con soporte en @AntiaSupport`;

      await this.bot.telegram.sendMessage(telegramUserId, thankYouMessage, {
        parse_mode: 'Markdown',
      });

      // NUEVO: Buscar el canal específico asociado al producto
      let channelLink: string | null = null;
      let channelTitle: string = product.title;

      if (product.telegramChannelId) {
        // Buscar el canal en la colección telegram_channels
        const channelResult = await this.prisma.$runCommandRaw({
          find: 'telegram_channels',
          filter: { 
            channel_id: product.telegramChannelId,
            tipster_id: tipster.id,
            is_active: true,
          },
          projection: { invite_link: 1, channel_title: 1 },
          limit: 1,
        }) as any;

        const channel = channelResult.cursor?.firstBatch?.[0];
        if (channel) {
          channelLink = channel.invite_link;
          channelTitle = channel.channel_title || product.title;
          this.logger.log(`Found product channel: ${channelTitle} with link: ${channelLink}`);
        }
      }

      // Si no hay canal específico del producto, buscar el canal legacy del tipster
      if (!channelLink) {
        const tipsterProfileResult = await this.prisma.$runCommandRaw({
          find: 'tipster_profiles',
          filter: { _id: { $oid: tipster.id } },
          projection: { premium_channel_link: 1 },
          limit: 1,
        }) as any;
        
        channelLink = tipsterProfileResult.cursor?.firstBatch?.[0]?.premium_channel_link || null;
        this.logger.log(`Using legacy tipster premium channel link: ${channelLink}`);
      }

      // Usar channelLink como el enlace final (antes era premiumChannelLink)
      const premiumChannelLink = channelLink;

      // Si hay un enlace de canal configurado (del producto o del tipster), enviarlo
      if (premiumChannelLink) {
        // Mensaje 2: Acceso al canal premium
        const accessMessage = 
          `🎯 *Compra autorizada*\n\n` +
          `Puede entrar al canal del servicio *${channelTitle}* pinchando aquí:\n\n` +
          `${premiumChannelLink}`;

        await this.bot.telegram.sendMessage(telegramUserId, accessMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🚀 Entrar al Canal', url: premiumChannelLink },
              ],
            ],
          },
        });

        // Mensaje 3: Confirmación final
        await this.bot.telegram.sendMessage(telegramUserId, 
          `✅ *Compra finalizada*\n\nYa tienes acceso al contenido premium.`,
          { parse_mode: 'Markdown' }
        );

        this.logger.log(`Payment success notification with premium channel link sent to ${telegramUserId}`);
        return { success: true, inviteLink: premiumChannelLink };

      } else {
        // El tipster no tiene canal premium configurado - solo confirmar la compra
        const noChannelMessage = 
          `🎯 *Compra autorizada*\n\n` +
          `Su compra ha sido procesada correctamente.\n\n` +
          `El tipster *${tipster.publicName}* le contactará pronto con los detalles de acceso.`;

        await this.bot.telegram.sendMessage(telegramUserId, noChannelMessage, {
          parse_mode: 'Markdown',
        });

        this.logger.log(`Payment success notification (no premium channel configured) sent to ${telegramUserId}`);
        return { success: true, inviteLink: null };
      }

    } catch (error) {
      this.logger.error('Error notifying payment success:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar al tipster sobre una nueva venta
   */
  async notifyTipsterNewSale(
    tipsterId: string,
    orderId: string,
    productId: string,
    amountCents: number,
    currency: string,
    buyerEmail?: string,
    buyerUsername?: string,
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

      // Format price
      const priceFormatted = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
      }).format(amountCents / 100);

      // Get tipster's Telegram ID to send notification
      // First check if tipster has a telegram_user_id
      if (tipster.telegramUserId) {
        const saleMessage = 
          `💰 *¡Nueva Venta!*\n\n` +
          `Has recibido una nueva compra:\n\n` +
          `📦 *Producto:* ${product?.title || 'Producto'}\n` +
          `💵 *Importe:* ${priceFormatted}\n` +
          `👤 *Comprador:* ${buyerUsername || buyerEmail || 'Anónimo'}\n` +
          `📅 *Fecha:* ${new Date().toLocaleString('es-ES')}\n\n` +
          `El cliente ya tiene acceso al contenido.`;

        try {
          await this.bot.telegram.sendMessage(tipster.telegramUserId, saleMessage, {
            parse_mode: 'Markdown',
          });
          this.logger.log(`Sale notification sent to tipster ${tipsterId}`);
        } catch (sendError) {
          this.logger.error('Error sending sale notification to tipster:', sendError);
        }
      }

      // Update tipster's earnings in database
      await this.updateTipsterEarnings(tipsterId, amountCents, currency);

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
      const result = await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $oid: tipsterId } },
        projection: { total_earnings_cents: 1, total_sales: 1 },
        limit: 1,
      }) as any;

      const currentEarnings = result.cursor?.firstBatch?.[0]?.total_earnings_cents || 0;
      const currentSales = result.cursor?.firstBatch?.[0]?.total_sales || 0;

      // Update earnings
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [{
          q: { _id: { $oid: tipsterId } },
          u: {
            $set: {
              total_earnings_cents: currentEarnings + amountCents,
              total_sales: currentSales + 1,
              last_sale_at: { $date: new Date().toISOString() },
              updated_at: { $date: new Date().toISOString() },
            },
          },
        }],
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
   * Manejar updates desde webhook
   */
  async handleUpdate(update: any) {
    try {
      this.logger.log(`Processing webhook update: ${JSON.stringify(update).substring(0, 200)}`);
      await this.bot.handleUpdate(update);
      this.logger.log('Webhook update processed successfully');
    } catch (error) {
      this.logger.error('Error handling update:', error);
      throw error;
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
    try {
      const chat = await this.bot.telegram.getChat(channelId);
      
      // Verify bot is admin
      const botInfo = await this.bot.telegram.getMe();
      const admins = await this.bot.telegram.getChatAdministrators(channelId);
      const isAdmin = admins.some(admin => admin.user.id === botInfo.id);

      if (!isAdmin) {
        return {
          valid: false,
          error: 'El bot no es administrador de este canal. Por favor, añade @Antiabetbot como administrador.',
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
      return {
        valid: false,
        error: 'No se pudo acceder al canal. Verifica que el ID sea correcto y que el bot sea administrador.',
      };
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
      const tipsterResult = await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $oid: tipsterId } },
        projection: { 
          publication_channel_id: 1, 
          publication_channel_title: 1,
          public_name: 1,
        },
        limit: 1,
      }) as any;

      const tipsterProfile = tipsterResult.cursor?.firstBatch?.[0];

      if (!tipsterProfile) {
        return { success: false, message: 'Perfil de tipster no encontrado' };
      }

      // Determine which channel to use
      const channelId = targetChannelId || tipsterProfile.publication_channel_id;

      if (!channelId) {
        return { 
          success: false, 
          message: 'No tienes un canal de publicación configurado. Configúralo en la sección de Telegram.',
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
          inline_keyboard: [
            [{ text: '💳 Comprar Ahora', url: checkoutUrl }],
          ],
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
}
