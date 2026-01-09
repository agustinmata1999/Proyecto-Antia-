import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

@Controller('telegram/auth')
export class TelegramAuthController {
  private readonly logger = new Logger(TelegramAuthController.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Obtener el tipsterId del usuario autenticado
   */
  private async getTipsterId(userId: string): Promise<string> {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
    });

    if (!tipsterProfile) {
      throw new BadRequestException('Perfil de tipster no encontrado');
    }

    return tipsterProfile.id;
  }

  /**
   * Verificar la autenticación de Telegram Login Widget
   * https://core.telegram.org/widgets/login#checking-authorization
   */
  private verifyTelegramAuth(authData: TelegramAuthData): boolean {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.error('TELEGRAM_BOT_TOKEN not configured');
      return false;
    }

    // Verificar que auth_date no sea muy antiguo (máximo 24 horas)
    const authDate = authData.auth_date;
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      this.logger.warn('Telegram auth data is too old');
      return false;
    }

    // Construir el data-check-string
    const { hash, ...dataWithoutHash } = authData;
    const dataCheckArr = Object.keys(dataWithoutHash)
      .sort()
      .map((key) => `${key}=${dataWithoutHash[key as keyof typeof dataWithoutHash]}`);
    const dataCheckString = dataCheckArr.join('\n');

    // Calcular el hash esperado
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return hash === expectedHash;
  }

  /**
   * POST /api/telegram/auth/connect - Vincular cuenta de Telegram al tipster
   * Recibe los datos del Telegram Login Widget
   */
  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async connectTelegram(@Body() body: TelegramAuthData, @Request() req) {
    this.logger.log(`Telegram auth request from user ${req.user.id}`);

    // Verificar la autenticación de Telegram
    if (!this.verifyTelegramAuth(body)) {
      this.logger.warn('Invalid Telegram auth data');
      throw new BadRequestException('Datos de autenticación de Telegram inválidos');
    }

    const tipsterId = await this.getTipsterId(req.user.id);
    const telegramUserId = body.id.toString();
    const telegramUsername = body.username || null;

    // Actualizar el perfil del tipster con el telegram_user_id
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipsterId } },
          u: {
            $set: {
              telegram_user_id: telegramUserId,
              telegram_username: telegramUsername ? `@${telegramUsername}` : null,
              telegram_connected_at: { $date: now },
              updated_at: { $date: now },
            },
          },
        },
      ],
    });

    this.logger.log(`✅ Telegram connected for tipster ${tipsterId}: ${telegramUserId}`);

    // Buscar canales que este usuario añadió el bot y conectarlos automáticamente
    const autoConnectedChannels = await this.autoConnectChannels(tipsterId, telegramUserId);

    return {
      success: true,
      message: 'Telegram vinculado correctamente',
      telegramId: telegramUserId,
      telegramUsername: telegramUsername,
      autoConnectedChannels: autoConnectedChannels.length,
      channels: autoConnectedChannels,
    };
  }

  /**
   * POST /api/telegram/auth/disconnect - Desvincular cuenta de Telegram
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectTelegram(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipsterId } },
          u: {
            $set: {
              telegram_user_id: null,
              telegram_username: null,
              updated_at: { $date: now },
            },
          },
        },
      ],
    });

    this.logger.log(`✅ Telegram disconnected for tipster ${tipsterId}`);

    return {
      success: true,
      message: 'Telegram desvinculado correctamente',
    };
  }

  /**
   * GET /api/telegram/auth/status - Obtener estado de conexión de Telegram
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
      select: {
        telegramUserId: true,
        telegramUsername: true,
        telegramConnectedAt: true,
      },
    });

    if (!tipster) {
      throw new BadRequestException('Perfil de tipster no encontrado');
    }

    const isConnected = !!tipster.telegramUserId;

    // Si está conectado, buscar canales disponibles
    let availableChannels: any[] = [];
    if (isConnected) {
      const channelsResult = (await this.prisma.$runCommandRaw({
        find: 'detected_telegram_channels',
        filter: {
          added_by_telegram_id: tipster.telegramUserId,
          is_active: true,
        },
      })) as any;

      availableChannels = (channelsResult.cursor?.firstBatch || []).map((ch: any) => ({
        channelId: ch.channel_id,
        channelTitle: ch.channel_title,
        channelUsername: ch.channel_username,
        inviteLink: ch.invite_link,
        detectedAt: ch.detected_at?.$date || ch.detected_at,
        isAutoConnected: !!ch.auto_connected_to,
      }));
    }

    return {
      isConnected,
      telegramId: tipster.telegramUserId,
      telegramUsername: tipster.telegramUsername,
      connectedAt: tipster.telegramConnectedAt,
      availableChannels,
    };
  }

  /**
   * GET /api/telegram/auth/available-channels - Obtener canales disponibles para conectar
   */
  @Get('available-channels')
  @UseGuards(JwtAuthGuard)
  async getAvailableChannels(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
      select: { telegramUserId: true },
    });

    if (!tipster?.telegramUserId) {
      return {
        connected: false,
        channels: [],
        message: 'Primero debes conectar tu cuenta de Telegram',
      };
    }

    // Buscar canales detectados donde este usuario añadió el bot
    const channelsResult = (await this.prisma.$runCommandRaw({
      find: 'detected_telegram_channels',
      filter: {
        added_by_telegram_id: tipster.telegramUserId,
        is_active: true,
      },
    })) as any;

    const detectedChannels = channelsResult.cursor?.firstBatch || [];

    // Buscar canales ya conectados por este tipster
    const connectedChannels = await this.prisma.telegramChannel.findMany({
      where: { tipsterId, isActive: true },
      select: { channelId: true },
    });
    const connectedChannelIds = new Set(connectedChannels.map((ch) => ch.channelId));

    // Marcar cuáles ya están conectados
    const channels = detectedChannels.map((ch: any) => ({
      channelId: ch.channel_id,
      channelTitle: ch.channel_title,
      channelUsername: ch.channel_username,
      channelType: ch.channel_type,
      inviteLink: ch.invite_link,
      detectedAt: ch.detected_at?.$date || ch.detected_at,
      isConnected: connectedChannelIds.has(ch.channel_id),
    }));

    return {
      connected: true,
      telegramId: tipster.telegramUserId,
      channels,
    };
  }

  /**
   * POST /api/telegram/auth/auto-connect-channel - Conectar un canal detectado automáticamente
   */
  @Post('auto-connect-channel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async autoConnectChannel(@Body() body: { channelId: string }, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
      select: { telegramUserId: true },
    });

    if (!tipster?.telegramUserId) {
      throw new BadRequestException('Primero debes conectar tu cuenta de Telegram');
    }

    // Verificar que el canal existe y pertenece a este usuario
    const channelResult = (await this.prisma.$runCommandRaw({
      find: 'detected_telegram_channels',
      filter: {
        channel_id: body.channelId,
        added_by_telegram_id: tipster.telegramUserId,
        is_active: true,
      },
      limit: 1,
    })) as any;

    const detectedChannel = channelResult.cursor?.firstBatch?.[0];

    if (!detectedChannel) {
      throw new BadRequestException(
        'Canal no encontrado o no tienes permisos para conectarlo',
      );
    }

    // Verificar si ya está conectado
    const existingChannel = await this.prisma.telegramChannel.findFirst({
      where: {
        tipsterId,
        channelId: body.channelId,
        isActive: true,
      },
    });

    if (existingChannel) {
      return {
        success: false,
        message: 'Este canal ya está conectado',
        channel: existingChannel,
      };
    }

    // Crear el canal
    const now = new Date().toISOString();
    const isPrivate = !detectedChannel.channel_username;

    await this.prisma.$runCommandRaw({
      insert: 'telegram_channels',
      documents: [
        {
          tipster_id: tipsterId,
          channel_id: detectedChannel.channel_id,
          channel_name: detectedChannel.channel_username
            ? `@${detectedChannel.channel_username}`
            : null,
          channel_title: detectedChannel.channel_title,
          channel_type: isPrivate ? 'private' : 'public',
          invite_link: detectedChannel.invite_link || null,
          member_count: null,
          is_active: true,
          connected_at: { $date: now },
          created_at: { $date: now },
          updated_at: { $date: now },
          connection_type: 'auto', // Marcar como conexión automática
        },
      ],
    });

    // Marcar el canal detectado como auto-conectado
    await this.prisma.$runCommandRaw({
      update: 'detected_telegram_channels',
      updates: [
        {
          q: { channel_id: body.channelId },
          u: { $set: { auto_connected_to: tipsterId } },
        },
      ],
    });

    // Obtener el canal creado
    const newChannel = await this.prisma.telegramChannel.findFirst({
      where: { tipsterId, channelId: body.channelId },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `✅ Auto-connected channel ${detectedChannel.channel_title} for tipster ${tipsterId}`,
    );

    return {
      success: true,
      message: 'Canal conectado correctamente',
      channel: newChannel,
    };
  }

  /**
   * Auto-conectar canales cuando el tipster vincula su Telegram
   */
  private async autoConnectChannels(
    tipsterId: string,
    telegramUserId: string,
  ): Promise<any[]> {
    const connectedChannels: any[] = [];

    try {
      // Buscar canales detectados que fueron añadidos por este usuario
      const channelsResult = (await this.prisma.$runCommandRaw({
        find: 'detected_telegram_channels',
        filter: {
          added_by_telegram_id: telegramUserId,
          is_active: true,
          auto_connected_to: null, // Solo los que no están conectados
        },
      })) as any;

      const detectedChannels = channelsResult.cursor?.firstBatch || [];

      for (const channel of detectedChannels) {
        // Verificar si ya existe para este tipster
        const existing = await this.prisma.telegramChannel.findFirst({
          where: {
            tipsterId,
            channelId: channel.channel_id,
          },
        });

        if (existing) {
          // Si existe pero está inactivo, reactivarlo
          if (!existing.isActive) {
            const now = new Date().toISOString();
            await this.prisma.$runCommandRaw({
              update: 'telegram_channels',
              updates: [
                {
                  q: { _id: { $oid: existing.id } },
                  u: {
                    $set: {
                      is_active: true,
                      channel_title: channel.channel_title,
                      invite_link: channel.invite_link || null,
                      updated_at: { $date: now },
                      connection_type: 'auto',
                    },
                  },
                },
              ],
            });
            connectedChannels.push({ ...existing, isActive: true });
          }
          continue;
        }

        // Crear nuevo canal
        const now = new Date().toISOString();
        const isPrivate = !channel.channel_username;

        await this.prisma.$runCommandRaw({
          insert: 'telegram_channels',
          documents: [
            {
              tipster_id: tipsterId,
              channel_id: channel.channel_id,
              channel_name: channel.channel_username
                ? `@${channel.channel_username}`
                : null,
              channel_title: channel.channel_title,
              channel_type: isPrivate ? 'private' : 'public',
              invite_link: channel.invite_link || null,
              member_count: null,
              is_active: true,
              connected_at: { $date: now },
              created_at: { $date: now },
              updated_at: { $date: now },
              connection_type: 'auto',
            },
          ],
        });

        // Marcar como auto-conectado
        await this.prisma.$runCommandRaw({
          update: 'detected_telegram_channels',
          updates: [
            {
              q: { channel_id: channel.channel_id },
              u: { $set: { auto_connected_to: tipsterId } },
            },
          ],
        });

        // Obtener el canal creado
        const newChannel = await this.prisma.telegramChannel.findFirst({
          where: { tipsterId, channelId: channel.channel_id },
          orderBy: { createdAt: 'desc' },
        });

        if (newChannel) {
          connectedChannels.push(newChannel);
        }

        this.logger.log(
          `✅ Auto-connected channel ${channel.channel_title} for tipster ${tipsterId}`,
        );
      }
    } catch (error) {
      this.logger.error('Error auto-connecting channels:', error);
    }

    return connectedChannels;
  }

  /**
   * GET /api/telegram/auth/bot-info - Obtener información del bot para el widget
   */
  @Get('bot-info')
  async getBotInfo() {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return {
        configured: false,
        message: 'Bot no configurado',
      };
    }

    // Extraer el bot username del token o usar variable de entorno
    const botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME') || 'Antiabetbot';

    return {
      configured: true,
      botUsername,
    };
  }
}
