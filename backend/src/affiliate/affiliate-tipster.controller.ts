import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AffiliateService } from './affiliate.service';

@Controller('affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateTipsterController {
  constructor(
    private affiliateService: AffiliateService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get tipster profile and verify module access
   */
  private async getTipsterProfile(userId: string) {
    const profile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ForbiddenException('Perfil de tipster no encontrado');
    }

    if (!profile.moduleAffiliate) {
      throw new ForbiddenException('El módulo de afiliación no está habilitado para tu cuenta');
    }

    return profile;
  }

  // ==================== HOUSES & LINKS ====================

  /**
   * Get all houses available for the tipster with their personalized links
   */
  @Get('houses')
  async getHousesWithLinks(@Request() req, @Query('countryCode') countryCode?: string) {
    const profile = await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getTipsterHousesWithLinks(profile.id, countryCode);
  }

  /**
   * Get a specific house with link
   */
  @Get('houses/:houseId')
  async getHouseWithLink(@Param('houseId') houseId: string, @Request() req) {
    const profile = await this.getTipsterProfile(req.user.id);

    const house = await this.affiliateService.getBettingHouse(houseId);
    const link = await this.affiliateService.getOrCreateTipsterLink(profile.id, houseId);

    return {
      house: {
        id: house.id,
        name: house.name,
        slug: house.slug,
        logoUrl: house.logoUrl,
        commissionPerReferralEur: house.commissionPerReferralEur,
        allowedCountries: house.allowedCountries,
        blockedCountries: house.blockedCountries,
      },
      link: {
        id: link.id,
        redirectCode: link.redirectCode,
        totalClicks: link.totalClicks,
        totalReferrals: link.totalReferrals,
      },
    };
  }

  /**
   * Get tipster's personal affiliate links
   */
  @Get('my-links')
  async getMyLinks(@Request() req) {
    const profile = await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getTipsterLinks(profile.id);
  }

  /**
   * Generate/get link for a specific house
   */
  @Post('houses/:houseId/link')
  async generateLink(@Param('houseId') houseId: string, @Request() req) {
    const profile = await this.getTipsterProfile(req.user.id);

    const house = await this.affiliateService.getBettingHouse(houseId);
    const link = await this.affiliateService.getOrCreateTipsterLink(profile.id, houseId);

    // Build the redirect URL
    const baseUrl = process.env.FRONTEND_URL || 'https://antia.com';
    const redirectUrl = `${baseUrl}/r/${link.redirectCode}`;

    return {
      success: true,
      link: {
        id: link.id,
        redirectCode: link.redirectCode,
        redirectUrl,
        totalClicks: link.totalClicks,
        totalReferrals: link.totalReferrals,
      },
      house: {
        id: house.id,
        name: house.name,
        slug: house.slug,
        commissionPerReferralEur: house.commissionPerReferralEur,
      },
    };
  }

  // ==================== MY REFERRALS ====================

  /**
   * Get tipster's own referrals (conversions) with detailed info
   */
  @Get('my-referrals')
  async getMyReferrals(
    @Request() req,
    @Query('houseId') houseId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getTipsterReferrals(profile.id, {
      houseId,
      status,
      startDate,
      endDate,
    });
  }

  // ==================== CAMPAIGNS ====================

  /**
   * Get active campaigns with houses
   */
  @Get('campaigns')
  async getCampaigns(@Request() req) {
    await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getAllCampaigns(false); // Only active
  }

  /**
   * Get campaign details
   */
  @Get('campaigns/:id')
  async getCampaign(@Param('id') id: string, @Request() req) {
    await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getCampaign(id);
  }

  // ==================== METRICS ====================

  /**
   * Get tipster's affiliate metrics
   */
  @Get('metrics')
  async getMetrics(@Request() req) {
    const profile = await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getTipsterAffiliateMetrics(profile.id);
  }

  // ==================== PAYOUTS ====================

  /**
   * Get tipster's affiliate payouts (liquidaciones)
   */
  @Get('payouts')
  async getMyPayouts(@Request() req) {
    const profile = await this.getTipsterProfile(req.user.id);
    const payouts = await this.affiliateService.getTipsterPayouts(profile.id);

    return payouts.map((p) => ({
      ...p,
      totalAmountEur: p.totalAmountCents / 100,
    }));
  }

  /**
   * Get payout details
   */
  @Get('payouts/:id')
  async getPayoutDetails(@Param('id') id: string, @Request() req) {
    const profile = await this.getTipsterProfile(req.user.id);

    const payout = await this.prisma.affiliatePayout.findUnique({ where: { id } });

    if (!payout || payout.tipsterId !== profile.id) {
      throw new ForbiddenException('Liquidación no encontrada');
    }

    return {
      ...payout,
      totalAmountEur: payout.totalAmountCents / 100,
    };
  }

  // ==================== STATISTICS ====================

  /**
   * Get detailed statistics for the tipster
   */
  @Get('tipster/stats')
  async getStats(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.getTipsterProfile(req.user.id);
    return this.affiliateService.getTipsterAffiliateStats(profile.id, startDate, endDate);
  }
}
