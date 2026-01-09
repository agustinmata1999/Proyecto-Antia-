import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) {}

  // Public endpoint to check Telegram bot status
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Telegram bot status (public)' })
  async getStatus() {
    const status = await this.telegramService.getBotStatus();
    return status;
  }

  // Force webhook setup (public for debugging)
  @Post('setup-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force webhook setup' })
  async setupWebhook() {
    const result = await this.telegramService.forceSetupWebhook();
    return result;
  }

  // Webhook endpoint (sin guards - debe ser público para Telegram)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram webhook endpoint' })
  async handleWebhook(@Req() req: any, @Body() update: any) {
    try {
      this.logger.log(`📥 Received webhook update: ${JSON.stringify(update).substring(0, 200)}...`);
      // Procesar el update con el bot
      await this.telegramService.handleUpdate(update);
      return { ok: true };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return { ok: false };
    }
  }

  // Endpoints protegidos
  @Post('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect Telegram channel manually' })
  async connectChannel(@CurrentUser() user: any, @Body() body: { channelIdentifier: string }) {
    // Obtener el perfil del tipster
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    return this.telegramService.connectChannelManually(tipster.id, body.channelIdentifier);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Telegram channel' })
  async disconnectChannel(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      throw new Error('Perfil de tipster no encontrado');
    }

    await this.telegramService.disconnectChannel(tipster.id);
  }

  @Get('channel-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connected channel info' })
  async getChannelInfo(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        connected: false,
        channel: null,
        premiumChannelLink: null,
      };
    }

    const channel = await this.telegramService.getConnectedChannel(tipster.id);

    // Get premium channel link from tipster profile
    const result = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { _id: { $oid: tipster.id } },
      projection: { premium_channel_link: 1 },
      limit: 1,
    })) as any;

    const premiumChannelLink = result.cursor?.firstBatch?.[0]?.premium_channel_link || null;

    return {
      connected: !!channel,
      channel,
      premiumChannelLink,
    };
  }

  @Post('premium-channel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set premium channel link for clients after purchase' })
  async setPremiumChannel(
    @CurrentUser() user: any,
    @Body() body: { premiumChannelLink: string | null },
  ) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    // Update the premium channel link
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipster.id } },
          u: {
            $set: {
              premium_channel_link: body.premiumChannelLink || null,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    this.logger.log(
      `Updated premium channel link for tipster ${tipster.id}: ${body.premiumChannelLink}`,
    );

    return {
      success: true,
      message: 'Canal premium actualizado correctamente',
      premiumChannelLink: body.premiumChannelLink,
    };
  }

  @Get('publication-channel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get publication channel info' })
  async getPublicationChannel(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        configured: false,
        pending: false,
        channelId: null,
        channelTitle: null,
        channelUsername: null,
      };
    }

    // Get publication channel from tipster profile
    const result = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { _id: { $oid: tipster.id } },
      projection: {
        publication_channel_id: 1,
        publication_channel_title: 1,
        publication_channel_username: 1,
        publication_channel_pending: 1,
      },
      limit: 1,
    })) as any;

    const profile = result.cursor?.firstBatch?.[0];

    return {
      configured: !!profile?.publication_channel_id,
      pending: !!profile?.publication_channel_pending,
      channelId: profile?.publication_channel_id || null,
      channelTitle: profile?.publication_channel_title || null,
      channelUsername: profile?.publication_channel_username || null,
    };
  }

  @Post('publication-channel/start-linking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start automatic channel linking process' })
  async startPublicationChannelLinking(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    // Set pending flag for automatic detection
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipster.id } },
          u: {
            $set: {
              publication_channel_pending: true,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    this.logger.log(`Started publication channel linking for tipster ${tipster.id}`);

    return {
      success: true,
      message:
        'Proceso de vinculación iniciado. Ahora añade @Antiabetbot como administrador a tu canal.',
      botUsername: 'Antiabetbot',
    };
  }

  @Post('publication-channel/cancel-linking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel automatic channel linking process' })
  async cancelPublicationChannelLinking(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    // Remove pending flag
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipster.id } },
          u: {
            $set: {
              publication_channel_pending: false,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    return {
      success: true,
      message: 'Proceso de vinculación cancelado',
    };
  }

  @Post('publication-channel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set publication channel for posting products (manual method)' })
  async setPublicationChannel(
    @CurrentUser() user: any,
    @Body() body: { channelId: string; channelTitle?: string },
  ) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    // Clean the channel identifier (support both @username and numeric ID)
    const channelIdentifier = body.channelId.trim();

    // Verify the channel exists and bot is admin
    try {
      const chatInfo = await this.telegramService.verifyChannelAccess(channelIdentifier);

      if (!chatInfo.valid) {
        return {
          success: false,
          message:
            chatInfo.error ||
            'No se pudo verificar el canal. Asegúrate de que @Antiabetbot sea administrador del canal.',
        };
      }

      // Update the publication channel
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [
          {
            q: { _id: { $oid: tipster.id } },
            u: {
              $set: {
                publication_channel_id: channelIdentifier,
                publication_channel_title:
                  body.channelTitle || chatInfo.title || 'Canal de Publicación',
                publication_channel_username: chatInfo.username ? `@${chatInfo.username}` : null,
                publication_channel_pending: false,
                updated_at: { $date: new Date().toISOString() },
              },
            },
          },
        ],
      });

      this.logger.log(
        `Updated publication channel for tipster ${tipster.id}: ${channelIdentifier}`,
      );

      return {
        success: true,
        message: '¡Canal de publicación configurado correctamente!',
        channelId: channelIdentifier,
        channelTitle: body.channelTitle || chatInfo.title,
        channelUsername: chatInfo.username ? `@${chatInfo.username}` : null,
      };
    } catch (error) {
      this.logger.error('Error setting publication channel:', error);
      return {
        success: false,
        message: 'Error al configurar el canal: ' + error.message,
      };
    }
  }

  @Delete('publication-channel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove publication channel' })
  async removePublicationChannel(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
          q: { _id: { $oid: tipster.id } },
          u: {
            $set: {
              publication_channel_id: null,
              publication_channel_title: null,
              updated_at: { $date: new Date().toISOString() },
            },
          },
        },
      ],
    });

    this.logger.log(`Removed publication channel for tipster ${tipster.id}`);

    return {
      success: true,
      message: 'Canal de publicación eliminado',
    };
  }
}
