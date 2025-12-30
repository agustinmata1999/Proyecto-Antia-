import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LandingService } from './landing.service';
import { CreateLandingDto, UpdateLandingDto } from './dto';

// ==================== LANDING PÚBLICA (SIN AUTH) ====================

@Controller('go')
export class LandingPublicController {
  constructor(private landingService: LandingService) {}

  /**
   * GET /api/go/:slug
   * Obtener landing pública por slug
   */
  @Get(':slug')
  async getPublicLanding(
    @Param('slug') slug: string,
    @Query('country') country?: string,
    @Req() req: Request,
  ) {
    // Detectar país por IP si no se proporciona
    let countryCode = country;
    if (!countryCode) {
      // Intentar detectar por header de geolocalización (Cloudflare, etc.)
      countryCode = req.headers['cf-ipcountry'] as string || 
                    req.headers['x-country-code'] as string ||
                    'ES'; // Default
    }

    // Registrar impresión
    const ip = req.headers['x-forwarded-for'] as string || req.ip;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'];
    const sessionId = req.cookies?.['antia_session'] || req.headers['x-session-id'] as string;

    await this.landingService.recordImpression(
      slug,
      countryCode,
      ip,
      userAgent,
      referrer,
      sessionId,
    );

    return this.landingService.getPublicLanding(slug, countryCode);
  }

  /**
   * GET /api/go/:slug/houses
   * Obtener casas de la landing para un país específico
   */
  @Get(':slug/houses')
  async getLandingHouses(
    @Param('slug') slug: string,
    @Query('country') country: string,
  ) {
    return this.landingService.getPublicLanding(slug, country);
  }
}

// ==================== REDIRECT CON TRACKING ====================

@Controller('r')
export class LandingRedirectController {
  constructor(private landingService: LandingService) {}

  /**
   * GET /api/r/:slug/:houseId
   * Registrar click y redirigir a la casa de apuestas
   */
  @Get(':slug/:houseId')
  async redirectWithTracking(
    @Param('slug') slug: string,
    @Param('houseId') houseId: string,
    @Query('country') country: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = req.headers['x-forwarded-for'] as string || req.ip;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'];
    const sessionId = req.cookies?.['antia_session'] || req.headers['x-session-id'] as string;

    const countryCode = country || 'ES';

    const result = await this.landingService.recordClickAndRedirect(
      slug,
      houseId,
      countryCode,
      ip,
      userAgent,
      referrer,
      sessionId,
    );

    // Redirigir a la casa de apuestas
    return res.redirect(302, result.redirectUrl);
  }

  /**
   * POST /api/r/click
   * Alternativa POST para registrar click (retorna URL sin redirección)
   */
  @Post('click')
  async recordClick(
    @Body() body: { slug: string; houseId: string; country: string },
    @Req() req: Request,
  ) {
    const ip = req.headers['x-forwarded-for'] as string || req.ip;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'];
    const sessionId = req.cookies?.['antia_session'] || req.headers['x-session-id'] as string;

    return this.landingService.recordClickAndRedirect(
      body.slug,
      body.houseId,
      body.country || 'ES',
      ip,
      userAgent,
      referrer,
      sessionId,
    );
  }
}

// ==================== PANEL TIPSTER - LANDINGS ====================

@Controller('tipster/landings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TIPSTER')
export class TipsterLandingController {
  constructor(private landingService: LandingService) {}

  /**
   * GET /api/tipster/landings
   * Listar landings del tipster
   */
  @Get()
  async getMyLandings(@Req() req: any) {
    const tipsterId = req.user.tipsterId;
    return this.landingService.getTipsterLandings(tipsterId);
  }

  /**
   * POST /api/tipster/landings
   * Crear nueva landing
   */
  @Post()
  async createLanding(@Req() req: any, @Body() dto: CreateLandingDto) {
    const tipsterId = req.user.tipsterId;
    return this.landingService.createLanding(tipsterId, dto);
  }

  /**
   * GET /api/tipster/landings/:id
   * Obtener detalle de una landing
   */
  @Get(':id')
  async getLanding(@Req() req: any, @Param('id') id: string) {
    const tipsterId = req.user.tipsterId;
    const landing = await this.landingService.getLandingById(id);
    
    if (landing.tipsterId !== tipsterId) {
      throw new Error('No tienes permiso para ver esta landing');
    }
    
    return landing;
  }

  /**
   * PUT /api/tipster/landings/:id
   * Actualizar landing
   */
  @Put(':id')
  async updateLanding(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLandingDto,
  ) {
    const tipsterId = req.user.tipsterId;
    return this.landingService.updateLanding(id, tipsterId, dto);
  }

  /**
   * DELETE /api/tipster/landings/:id
   * Eliminar landing
   */
  @Delete(':id')
  async deleteLanding(@Req() req: any, @Param('id') id: string) {
    const tipsterId = req.user.tipsterId;
    return this.landingService.deleteLanding(id, tipsterId);
  }

  /**
   * GET /api/tipster/landings/:id/metrics
   * Obtener métricas de una landing
   */
  @Get(':id/metrics')
  async getLandingMetrics(
    @Req() req: any,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tipsterId = req.user.tipsterId;
    return this.landingService.getLandingMetrics(
      id,
      tipsterId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * GET /api/tipster/landings/:id/clicks
   * Historial de clicks de una landing
   */
  @Get(':id/clicks')
  async getLandingClicks(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tipsterId = req.user.tipsterId;
    return this.landingService.getLandingClickHistory(
      id,
      tipsterId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /api/tipster/landings/houses/:country
   * Obtener casas disponibles para un país
   */
  @Get('houses/:country')
  async getAvailableHouses(@Param('country') country: string) {
    return this.landingService.getAvailableHousesForCountry(country);
  }
}
