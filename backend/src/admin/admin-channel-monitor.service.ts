import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminChannelMonitorService {
  private readonly logger = new Logger(AdminChannelMonitorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all channels that can be monitored (from detected channels)
   * with their monitoring status
   */
  async getMonitorableChannels(tipsterId?: string) {
    // Get detected channels
    const whereClause: any = { isActive: true };
    
    // Build the query to get channels with their monitoring config
    const detectedChannels = await this.prisma.detectedTelegramChannel.findMany({
      where: whereClause,
      orderBy: { detectedAt: 'desc' },
    });

    // Get monitoring configs for these channels
    const channelIds = detectedChannels.map(c => c.channelId);
    const monitorConfigs = await this.prisma.channelMonitorConfig.findMany({
      where: { channelId: { in: channelIds } },
    });

    // Create a map for quick lookup
    const configMap = new Map(monitorConfigs.map(c => [c.channelId, c]));

    // Get tipster profiles to match with channels
    const tipsterProfiles = await this.prisma.tipsterProfile.findMany({
      where: {
        OR: [
          { telegramChannelId: { in: channelIds } },
          { telegramUserId: { in: detectedChannels.map(c => c.addedByTelegramId).filter(Boolean) as string[] } },
        ],
      },
    });

    // Create maps for tipster lookup
    const tipsterByChannel = new Map(tipsterProfiles.filter(t => t.telegramChannelId).map(t => [t.telegramChannelId, t]));
    const tipsterByTelegramId = new Map(tipsterProfiles.filter(t => t.telegramUserId).map(t => [t.telegramUserId, t]));

    // Combine data
    const result = detectedChannels.map(channel => {
      const config = configMap.get(channel.channelId);
      const tipster = tipsterByChannel.get(channel.channelId) || 
                      (channel.addedByTelegramId ? tipsterByTelegramId.get(channel.addedByTelegramId) : null);

      return {
        id: channel.id,
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        channelUsername: channel.channelUsername,
        channelType: channel.channelType,
        addedByUsername: channel.addedByUsername,
        detectedAt: channel.detectedAt,
        tipsterId: tipster?.id || config?.tipsterId || null,
        tipsterName: tipster?.publicName || config?.tipsterName || null,
        isMonitoring: config?.isMonitoring || false,
        monitoringStartedAt: config?.startedAt || null,
        messageCount: config?.messageCount || 0,
      };
    });

    // Filter by tipster if requested
    if (tipsterId) {
      return result.filter(c => c.tipsterId === tipsterId);
    }

    return result;
  }

  /**
   * Get all tipsters with their channels for the dropdown
   */
  async getTipstersWithChannels() {
    const tipsters = await this.prisma.tipsterProfile.findMany({
      where: {
        applicationStatus: 'APPROVED',
      },
      select: {
        id: true,
        publicName: true,
        telegramUsername: true,
        telegramChannelId: true,
        telegramUserId: true,
      },
      orderBy: { publicName: 'asc' },
    });

    // Get all detected channels
    const detectedChannels = await this.prisma.detectedTelegramChannel.findMany({
      where: { isActive: true },
    });

    // Map tipsters with their channels
    return tipsters.map(tipster => {
      // Find channels that belong to this tipster
      const channels = detectedChannels.filter(ch => 
        ch.channelId === tipster.telegramChannelId ||
        ch.addedByTelegramId === tipster.telegramUserId
      );

      return {
        id: tipster.id,
        publicName: tipster.publicName,
        telegramUsername: tipster.telegramUsername,
        channelCount: channels.length,
      };
    }).filter(t => t.channelCount > 0); // Only tipsters with channels
  }

  /**
   * Toggle monitoring for a channel
   */
  async toggleMonitoring(channelId: string, enable: boolean, adminEmail: string) {
    // Get channel info
    const channel = await this.prisma.detectedTelegramChannel.findUnique({
      where: { channelId },
    });

    if (!channel) {
      throw new Error('Canal no encontrado');
    }

    // Find tipster if possible
    const tipster = await this.prisma.tipsterProfile.findFirst({
      where: {
        OR: [
          { telegramChannelId: channelId },
          { telegramUserId: channel.addedByTelegramId || undefined },
        ],
      },
    });

    // Check if config exists
    const existingConfig = await this.prisma.channelMonitorConfig.findFirst({
      where: { channelId },
    });

    const now = new Date();

    if (existingConfig) {
      // Update existing config using raw MongoDB command
      await this.prisma.$runCommandRaw({
        update: 'channel_monitor_configs',
        updates: [
          {
            q: { channel_id: channelId },
            u: {
              $set: {
                is_monitoring: enable,
                started_at: enable ? { $date: now.toISOString() } : existingConfig.startedAt,
                stopped_at: enable ? null : { $date: now.toISOString() },
                started_by: enable ? adminEmail : existingConfig.startedBy,
                updated_at: { $date: now.toISOString() },
              },
            },
          },
        ],
      });
    } else {
      // Create new config using raw MongoDB command
      await this.prisma.$runCommandRaw({
        insert: 'channel_monitor_configs',
        documents: [
          {
            channel_id: channelId,
            channel_title: channel.channelTitle,
            tipster_id: tipster?.id || null,
            tipster_name: tipster?.publicName || null,
            is_monitoring: enable,
            started_at: enable ? { $date: now.toISOString() } : null,
            stopped_at: null,
            started_by: adminEmail,
            message_count: 0,
            created_at: { $date: now.toISOString() },
            updated_at: { $date: now.toISOString() },
          },
        ],
      });
    }

    this.logger.log(`📡 Monitoring ${enable ? 'ENABLED' : 'DISABLED'} for channel: ${channel.channelTitle} (${channelId}) by ${adminEmail}`);

    return {
      success: true,
      channelId,
      channelTitle: channel.channelTitle,
      isMonitoring: enable,
    };
  }

  /**
   * Check if a channel is being monitored (used by telegram service)
   */
  async isChannelMonitored(channelId: string): Promise<boolean> {
    const config = await this.prisma.channelMonitorConfig.findFirst({
      where: { channelId },
      select: { isMonitoring: true },
    });
    return config?.isMonitoring || false;
  }

  /**
   * Save a message from a monitored channel
   */
  async saveMessage(data: {
    channelId: string;
    channelTitle?: string;
    messageId: number;
    senderUserId?: string;
    senderUsername?: string;
    senderFirstName?: string;
    senderLastName?: string;
    messageType: string;
    textContent?: string;
    caption?: string;
    replyToMessageId?: number;
    forwardFromId?: string;
    telegramDate: Date;
  }) {
    try {
      // Check if monitoring is enabled
      const isMonitored = await this.isChannelMonitored(data.channelId);
      if (!isMonitored) {
        return null;
      }

      // Check for duplicate
      const existing = await this.prisma.channelMessage.findFirst({
        where: {
          channelId: data.channelId,
          messageId: data.messageId,
        },
      });

      if (existing) {
        return existing;
      }

      // Save the message
      const message = await this.prisma.channelMessage.create({
        data: {
          channelId: data.channelId,
          channelTitle: data.channelTitle,
          messageId: data.messageId,
          senderUserId: data.senderUserId,
          senderUsername: data.senderUsername,
          senderFirstName: data.senderFirstName,
          senderLastName: data.senderLastName,
          messageType: data.messageType,
          textContent: data.textContent,
          caption: data.caption,
          replyToMessageId: data.replyToMessageId,
          forwardFromId: data.forwardFromId,
          telegramDate: data.telegramDate,
        },
      });

      // Update message count using raw command
      await this.prisma.$runCommandRaw({
        update: 'channel_monitor_configs',
        updates: [
          {
            q: { channel_id: data.channelId },
            u: { $inc: { message_count: 1 } },
          },
        ],
      });

      this.logger.debug(`💬 Saved message ${data.messageId} from channel ${data.channelId}`);
      return message;
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`);
      return null;
    }
  }

  /**
   * Get messages from a channel with date filters
   */
  async getChannelMessages(
    channelId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { startDate, endDate, limit = 100, offset = 0 } = options;

    const whereClause: any = { channelId };

    if (startDate || endDate) {
      whereClause.telegramDate = {};
      if (startDate) whereClause.telegramDate.gte = startDate;
      if (endDate) whereClause.telegramDate.lte = endDate;
    }

    const [messages, total] = await Promise.all([
      this.prisma.channelMessage.findMany({
        where: whereClause,
        orderBy: { telegramDate: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.channelMessage.count({ where: whereClause }),
    ]);

    // Get channel info
    const channelConfig = await this.prisma.channelMonitorConfig.findFirst({
      where: { channelId },
    });

    return {
      channelId,
      channelTitle: channelConfig?.channelTitle || 'Desconocido',
      tipsterName: channelConfig?.tipsterName,
      isMonitoring: channelConfig?.isMonitoring || false,
      messages: messages.map(m => ({
        id: m.id,
        messageId: m.messageId,
        senderName: [m.senderFirstName, m.senderLastName].filter(Boolean).join(' ') || m.senderUsername || 'Desconocido',
        senderUsername: m.senderUsername,
        messageType: m.messageType,
        content: m.textContent || m.caption || this.getMessageTypeLabel(m.messageType),
        timestamp: m.telegramDate,
        isReply: !!m.replyToMessageId,
        isForward: !!m.forwardFromId,
      })),
      total,
      hasMore: offset + messages.length < total,
    };
  }

  private getMessageTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      photo: '📷 Foto',
      video: '🎬 Video',
      document: '📄 Documento',
      audio: '🎵 Audio',
      voice: '🎤 Audio',
      sticker: '😀 Sticker',
      animation: '🎞️ GIF',
      video_note: '🎥 Video circular',
      location: '📍 Ubicación',
      contact: '👤 Contacto',
      poll: '📊 Encuesta',
    };
    return labels[type] || `[${type}]`;
  }

  /**
   * Get monitoring stats
   */
  async getMonitoringStats() {
    const [activeCount, totalMessages, channelStats] = await Promise.all([
      this.prisma.channelMonitorConfig.count({ where: { isMonitoring: true } }),
      this.prisma.channelMessage.count(),
      this.prisma.channelMonitorConfig.findMany({
        where: { isMonitoring: true },
        select: {
          channelTitle: true,
          messageCount: true,
        },
        orderBy: { messageCount: 'desc' },
        take: 5,
      }),
    ]);

    return {
      activeMonitoring: activeCount,
      totalMessages,
      topChannels: channelStats,
    };
  }
}
