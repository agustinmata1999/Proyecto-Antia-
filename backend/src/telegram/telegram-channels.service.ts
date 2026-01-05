import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

export interface CreateChannelDto {
  channelId: string;
  channelName?: string;
  channelTitle: string;
  channelType: 'public' | 'private';
  inviteLink?: string;
}

export interface UpdateChannelDto {
  channelTitle?: string;
  inviteLink?: string;
  isActive?: boolean;
}

@Injectable()
export class TelegramChannelsService {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(TelegramChannelsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      try {
        this.bot = new Telegraf(token);
      } catch (error) {
        this.logger.error('Failed to create Telegram bot for channels service:', error);
        this.bot = null;
      }
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured - channel features may be limited');
    }
  }

  /**
   * Obtener todos los canales de un tipster
   */
  async findAllByTipster(tipsterId: string) {
    return this.prisma.telegramChannel.findMany({
      where: { tipsterId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener un canal por ID
   */
  async findOne(id: string, tipsterId: string) {
    const channel = await this.prisma.telegramChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Canal no encontrado');
    }

    if (channel.tipsterId !== tipsterId) {
      throw new ForbiddenException('No tienes acceso a este canal');
    }

    return channel;
  }

  /**
   * Crear/conectar un nuevo canal
   */
  async create(tipsterId: string, dto: CreateChannelDto) {
    // Verificar si el canal ya existe para este tipster
    const existing = await this.prisma.telegramChannel.findFirst({
      where: { 
        tipsterId, 
        channelId: dto.channelId 
      },
    });

    if (existing) {
      // Si existe pero está inactivo, reactivarlo usando $runCommandRaw
      if (!existing.isActive) {
        const now = new Date().toISOString();
        await this.prisma.$runCommandRaw({
          update: 'telegram_channels',
          updates: [{
            q: { _id: { $oid: existing.id } },
            u: { 
              $set: {
                is_active: true,
                channel_title: dto.channelTitle,
                channel_name: dto.channelName || null,
                invite_link: dto.inviteLink || null,
                updated_at: { $date: now },
              }
            },
          }],
        });
        
        // Obtener el canal actualizado
        const updated = await this.prisma.telegramChannel.findUnique({
          where: { id: existing.id },
        });
        return updated;
      }
      throw new BadRequestException('Este canal ya está conectado');
    }

    // Crear nuevo canal usando $runCommandRaw para evitar transacciones
    const now = new Date().toISOString();
    
    // NO intentamos generar invite link automáticamente para evitar timeouts
    // El usuario puede generarlo después desde el panel si lo necesita
    let inviteLink = dto.inviteLink || null;
    
    const channelData = {
      tipster_id: tipsterId,
      channel_id: dto.channelId,
      channel_name: dto.channelName || null,
      channel_title: dto.channelTitle,
      channel_type: dto.channelType,
      invite_link: inviteLink,
      member_count: null,
      is_active: true,
      connected_at: { $date: now },
      created_at: { $date: now },
      updated_at: { $date: now },
    };

    await this.prisma.$runCommandRaw({
      insert: 'telegram_channels',
      documents: [channelData],
    });

    // Obtener el canal recién creado
    const channels = await this.prisma.telegramChannel.findMany({
      where: { tipsterId, channelId: dto.channelId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return channels[0];
  }

  /**
   * Actualizar un canal
   */
  async update(id: string, tipsterId: string, dto: UpdateChannelDto) {
    const channel = await this.findOne(id, tipsterId);

    // Build update object for MongoDB raw command
    const updateSet: any = { updated_at: { $date: new Date().toISOString() } };
    if (dto.channelTitle) updateSet.channel_title = dto.channelTitle;
    if (dto.inviteLink !== undefined) updateSet.invite_link = dto.inviteLink;
    if (dto.isActive !== undefined) updateSet.is_active = dto.isActive;

    await this.prisma.$runCommandRaw({
      update: 'telegram_channels',
      updates: [
        {
          q: { _id: { $oid: channel.id } },
          u: { $set: updateSet },
        },
      ],
    });

    // Return updated channel
    return this.findOne(id, tipsterId);
  }

  /**
   * Eliminar (desactivar) un canal
   */
  async remove(id: string, tipsterId: string) {
    const channel = await this.findOne(id, tipsterId);

    // En lugar de eliminar, desactivamos usando raw command para evitar transacciones
    const now = new Date().toISOString();
    await this.prisma.$runCommandRaw({
      update: 'telegram_channels',
      updates: [
        {
          q: { _id: { $oid: channel.id } },
          u: { $set: { is_active: false, updated_at: { $date: now } } },
        },
      ],
    });

    return { ...channel, isActive: false };
  }

  /**
   * Verificar información del canal desde Telegram API
   */
  async verifyChannel(channelId: string): Promise<{
    valid: boolean;
    title?: string;
    username?: string;
    type?: string;
    memberCount?: number;
    error?: string;
  }> {
    if (!this.bot) {
      return { valid: false, error: 'Bot no configurado' };
    }

    try {
      const chat = await this.bot.telegram.getChat(channelId) as any;
      
      return {
        valid: true,
        title: chat.title || 'Canal',
        username: chat.username || undefined,
        type: chat.type === 'channel' ? 'channel' : 
              chat.type === 'supergroup' ? 'supergroup' : chat.type,
        memberCount: chat.members_count || undefined,
      };
    } catch (error) {
      this.logger.warn(`Error verifying channel ${channelId}:`, error);
      return { 
        valid: false, 
        error: 'No se pudo verificar el canal. Asegúrate de que el bot sea administrador.' 
      };
    }
  }

  /**
   * Obtener enlace de invitación para un canal privado
   */
  async getInviteLink(channelId: string): Promise<string | null> {
    if (!this.bot) {
      return null;
    }

    try {
      const link = await this.bot.telegram.exportChatInviteLink(channelId);
      return link;
    } catch (error) {
      this.logger.warn(`Error getting invite link for ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Actualizar contador de miembros
   */
  async updateMemberCount(id: string, tipsterId: string) {
    const channel = await this.findOne(id, tipsterId);
    
    const verification = await this.verifyChannel(channel.channelId);
    
    if (verification.valid && verification.memberCount !== undefined) {
      await this.prisma.$runCommandRaw({
        update: 'telegram_channels',
        updates: [
          {
            q: { _id: { $oid: channel.id } },
            u: { 
              $set: { 
                member_count: verification.memberCount, 
                updated_at: { $date: new Date().toISOString() } 
              } 
            },
          },
        ],
      });
      return this.findOne(id, tipsterId);
    }

    return channel;
  }

  /**
   * Obtener canal por channelId de Telegram
   */
  async findByChannelId(tipsterId: string, channelId: string) {
    return this.prisma.telegramChannel.findFirst({
      where: { 
        tipsterId, 
        channelId,
        isActive: true,
      },
    });
  }
}
