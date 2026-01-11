import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  TelegramChannelsService,
  CreateChannelDto,
  UpdateChannelDto,
} from './telegram-channels.service';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConnectByInviteLinkDto,
  ConnectByNameDto,
  ConnectByIdDto,
  VerifyChannelDto,
  SearchByNameDto,
} from './dto/connect-channel.dto';

@Controller('telegram/channels')
@UseGuards(JwtAuthGuard)
export class TelegramChannelsController {
  constructor(
    private channelsService: TelegramChannelsService,
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) {}

  /**
   * Obtener el tipsterId del usuario autenticado
   */
  private async getTipsterId(userId: string): Promise<string> {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
    });

    if (!tipsterProfile) {
      throw new Error('Perfil de tipster no encontrado');
    }

    return tipsterProfile.id;
  }

  /**
   * GET /api/telegram/channels - Obtener todos los canales del tipster
   */
  @Get()
  async findAll(@Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    const channels = await this.channelsService.findAllByTipster(tipsterId);
    return { channels };
  }

  /**
   * GET /api/telegram/channels/:id - Obtener un canal específico
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    return this.channelsService.findOne(id, tipsterId);
  }

  /**
   * POST /api/telegram/channels - Crear/conectar un nuevo canal
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateChannelDto, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    const channel = await this.channelsService.create(tipsterId, dto);
    return {
      success: true,
      message: 'Canal conectado correctamente',
      channel,
    };
  }

  /**
   * POST /api/telegram/channels/verify - Verificar un canal antes de conectarlo
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyChannel(@Body() body: VerifyChannelDto) {
    const result = await this.channelsService.verifyChannel(body.channelId);
    return result;
  }

  /**
   * PATCH /api/telegram/channels/:id - Actualizar un canal
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChannelDto, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    const channel = await this.channelsService.update(id, tipsterId, dto);
    return {
      success: true,
      message: 'Canal actualizado correctamente',
      channel,
    };
  }

  /**
   * DELETE /api/telegram/channels/:id - Eliminar (desactivar) un canal
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    await this.channelsService.remove(id, tipsterId);
    return {
      success: true,
      message: 'Canal desconectado correctamente',
    };
  }

  /**
   * POST /api/telegram/channels/:id/refresh - Actualizar info del canal desde Telegram
   */
  @Post(':id/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Param('id') id: string, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    const channel = await this.channelsService.updateMemberCount(id, tipsterId);
    return {
      success: true,
      channel,
    };
  }

  /**
   * POST /api/telegram/channels/:id/invite-link - Generar nuevo enlace de invitación
   */
  @Post(':id/invite-link')
  @HttpCode(HttpStatus.OK)
  async generateInviteLink(@Param('id') id: string, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);
    const channel = await this.channelsService.findOne(id, tipsterId);

    const inviteLink = await this.channelsService.getInviteLink(channel.channelId);

    if (inviteLink) {
      // Actualizar el enlace en la base de datos
      await this.channelsService.update(id, tipsterId, { inviteLink });
      return {
        success: true,
        inviteLink,
      };
    }

    return {
      success: false,
      error: 'No se pudo generar el enlace de invitación',
    };
  }

  /**
   * POST /api/telegram/channels/connect-by-invite-link - Conectar canal por link de invitación
   * El tipster pega el link de invitación y el sistema busca el canal automáticamente
   */
  @Post('connect-by-invite-link')
  @HttpCode(HttpStatus.OK)
  async connectByInviteLink(@Body() body: ConnectByInviteLinkDto, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    // Extraer el hash del invite link
    // Formatos posibles:
    // - https://t.me/+abc123xyz
    // - t.me/+abc123xyz
    // - https://t.me/joinchat/abc123xyz (formato antiguo)
    // - https://t.me/channelname (canales públicos)
    const inviteLink = body.inviteLink.trim();

    // Buscar el canal en la base de datos por invite link
    const searchResult = await this.telegramService.findChannelByInviteLink(inviteLink);

    if (!searchResult.found || !searchResult.channel) {
      return {
        success: false,
        message:
          searchResult.error ||
          'Canal no encontrado. Asegúrate de que el bot (@Antiabetbot) sea administrador del canal.',
      };
    }

    // Verificar si el canal ya está conectado para este tipster
    const existingChannel = await this.channelsService.findByChannelId(
      tipsterId,
      searchResult.channel.channelId,
    );

    if (existingChannel) {
      return {
        success: false,
        message: 'Este canal ya está conectado a tu cuenta',
        channel: existingChannel,
      };
    }

    // Crear el canal usando el servicio existente
    try {
      const isPrivate = !searchResult.channel.channelUsername;

      const channel = await this.channelsService.create(tipsterId, {
        channelId: searchResult.channel.channelId,
        channelTitle: searchResult.channel.channelTitle,
        channelName: searchResult.channel.channelUsername
          ? `@${searchResult.channel.channelUsername}`
          : undefined,
        channelType: isPrivate ? 'private' : 'public',
        inviteLink: inviteLink,
      });

      return {
        success: true,
        message: 'Canal conectado correctamente',
        channel,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al conectar el canal',
      };
    }
  }

  /**
   * POST /api/telegram/channels/connect-by-name - Conectar canal por nombre (NUEVO)
   * El tipster ingresa el nombre del canal y opcionalmente el link para diferenciar
   */
  @Post('connect-by-name')
  @HttpCode(HttpStatus.OK)
  async connectByName(@Body() body: ConnectByNameDto, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    // Buscar el canal por nombre en la tabla de canales detectados
    const searchResult = await this.telegramService.findChannelByName(body.channelName, body.inviteLink);

    if (!searchResult.found || !searchResult.channel) {
      return {
        success: false,
        message:
          searchResult.error ||
          'Canal no encontrado. Asegúrate de que el bot (@Antiabetbot) sea administrador del canal.',
      };
    }

    // Verificar si el canal ya está conectado para este tipster
    const existingChannel = await this.channelsService.findByChannelId(
      tipsterId,
      searchResult.channel.channelId,
    );

    if (existingChannel) {
      return {
        success: false,
        message: 'Este canal ya está conectado a tu cuenta',
        channel: existingChannel,
      };
    }

    // Crear el canal usando el servicio existente
    try {
      // Determinar si es privado o público:
      // - Si tiene @username → público
      // - Si NO tiene @username → privado (la mayoría de canales premium)
      const isPrivate = !searchResult.channel.channelUsername;

      const channel = await this.channelsService.create(tipsterId, {
        channelId: searchResult.channel.channelId,
        channelTitle: searchResult.channel.channelTitle,
        channelName: searchResult.channel.channelUsername
          ? `@${searchResult.channel.channelUsername}`
          : undefined,
        channelType: isPrivate ? 'private' : 'public',
        inviteLink: body.inviteLink || undefined, // Guardar el link de invitación
      });

      return {
        success: true,
        message: 'Canal conectado correctamente',
        channel,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al conectar el canal',
      };
    }
  }

  /**
   * POST /api/telegram/channels/search-by-name - Buscar canal por nombre (sin conectar)
   * Útil para verificar si un canal existe antes de intentar conectarlo
   */
  @Post('search-by-name')
  @HttpCode(HttpStatus.OK)
  async searchByName(@Body() body: SearchByNameDto) {
    return this.telegramService.findChannelByName(body.channelName);
  }

  /**
   * POST /api/telegram/channels/connect-by-id - Conectar canal por ID
   * Verifica que el bot sea admin y registra el canal automáticamente
   */
  @Post('connect-by-id')
  @HttpCode(HttpStatus.OK)
  async connectById(@Body() body: ConnectByIdDto, @Request() req) {
    const tipsterId = await this.getTipsterId(req.user.id);

    // Verificar si ya está conectado
    const existingChannel = await this.channelsService.findByChannelId(
      tipsterId,
      body.channelId.trim(),
    );

    if (existingChannel) {
      return {
        success: false,
        message: 'Este canal ya está conectado a tu cuenta',
        channel: existingChannel,
      };
    }

    // Verificar, registrar y conectar
    return this.telegramService.connectChannelById(tipsterId, body.channelId.trim());
  }

  /**
   * POST /api/telegram/channels/verify-by-id - Verificar canal por ID (sin conectar)
   * Útil para verificar si el bot es admin de un canal
   */
  @Post('verify-by-id')
  @HttpCode(HttpStatus.OK)
  async verifyById(@Body() body: VerifyChannelDto) {
    return this.telegramService.verifyAndRegisterChannelById(body.channelId.trim());
  }
}
