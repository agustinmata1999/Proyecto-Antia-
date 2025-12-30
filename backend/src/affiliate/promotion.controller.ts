import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PromotionService, CreatePromotionDto, UpdatePromotionDto, UpdateHouseLinkDto } from './promotion.service';

@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class PromotionAdminController {
  constructor(private promotionService: PromotionService) {}

  /**
   * GET /api/admin/promotions
   * Listar todas las promociones
   */
  @Get()
  async getAllPromotions() {
    return this.promotionService.getAllPromotions();
  }

  /**
   * POST /api/admin/promotions
   * Crear nueva promoción
   */
  @Post()
  async createPromotion(@Req() req: any, @Body() dto: CreatePromotionDto) {
    return this.promotionService.createPromotion(req.user.id, dto);
  }

  /**
   * GET /api/admin/promotions/:id
   * Obtener detalle de una promoción
   */
  @Get(':id')
  async getPromotion(@Param('id') id: string) {
    return this.promotionService.getPromotionById(id);
  }

  /**
   * PUT /api/admin/promotions/:id
   * Actualizar promoción
   */
  @Put(':id')
  async updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionService.updatePromotion(id, dto);
  }

  /**
   * DELETE /api/admin/promotions/:id
   * Eliminar promoción
   */
  @Delete(':id')
  async deletePromotion(@Param('id') id: string) {
    return this.promotionService.deletePromotion(id);
  }

  /**
   * POST /api/admin/promotions/:id/houses
   * Añadir casa a una promoción
   */
  @Post(':id/houses')
  async addHouseLink(
    @Param('id') id: string,
    @Body() body: { bettingHouseId: string; affiliateUrl: string; trackingParamName?: string },
  ) {
    return this.promotionService.addHouseLink(id, body.bettingHouseId, body.affiliateUrl, body.trackingParamName);
  }

  /**
   * PUT /api/admin/promotions/houses/:linkId
   * Actualizar link de casa
   */
  @Put('houses/:linkId')
  async updateHouseLink(@Param('linkId') linkId: string, @Body() dto: UpdateHouseLinkDto) {
    return this.promotionService.updateHouseLink(linkId, dto);
  }

  /**
   * DELETE /api/admin/promotions/houses/:linkId
   * Eliminar link de casa
   */
  @Delete('houses/:linkId')
  async removeHouseLink(@Param('linkId') linkId: string) {
    return this.promotionService.removeHouseLink(linkId);
  }
}

// Controlador para que tipsters obtengan promociones activas
@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionPublicController {
  constructor(private promotionService: PromotionService) {}

  /**
   * GET /api/promotions
   * Listar promociones activas (para tipsters)
   */
  @Get()
  async getActivePromotions() {
    return this.promotionService.getActivePromotions();
  }

  /**
   * GET /api/promotions/:id/houses
   * Obtener casas de una promoción
   */
  @Get(':id/houses')
  async getPromotionHouses(@Param('id') id: string) {
    return this.promotionService.getPromotionHouses(id);
  }
}
