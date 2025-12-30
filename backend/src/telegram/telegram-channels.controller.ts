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
import { TelegramChannelsService, CreateChannelDto, UpdateChannelDto } from './telegram-channels.service';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';

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
  async verifyChannel(@Body() body: { channelId: string }) {
    const result = await this.channelsService.verifyChannel(body.channelId);
    return result;
  }

  /**
   * PATCH /api/telegram/channels/:id - Actualizar un canal
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
    @Request() req,
  ) {
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
}
