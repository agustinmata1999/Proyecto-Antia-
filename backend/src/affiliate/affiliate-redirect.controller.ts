import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  Headers,
  Body,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AffiliateService } from './affiliate.service';
import { ObjectId } from 'mongodb';

// Simple IP-based geolocation (reuse from checkout if available)
async function getCountryFromIp(ip: string): Promise<string | null> {
  try {
    // Clean IP
    const cleanIp = ip?.replace('::ffff:', '') || '';
    if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === 'localhost') {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${cleanIp}?fields=countryCode`);
    const data = await response.json();
    return data.countryCode || null;
  } catch {
    return null;
  }
}

@Controller('r')
export class AffiliateRedirectController {
  private readonly logger = new Logger(AffiliateRedirectController.name);
  
  constructor(
    private affiliateService: AffiliateService,
    private prisma: PrismaService,
  ) {}

  /**
   * Public redirect endpoint: /r/:redirectCode
   * - Records click
   * - Detects country from IP
   * - If allowed: redirects to master URL with tracking param
   * - If blocked: shows error page with alternatives
   */
  @Public()
  @Get(':redirectCode')
  async handleRedirect(
    @Param('redirectCode') redirectCode: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    try {
      // Find the link using raw query (redirectCode is not unique in Prisma)
      const linkResult = await this.prisma.$runCommandRaw({
        find: 'tipster_affiliate_links',
        filter: { redirect_code: redirectCode },
        limit: 1,
      }) as any;

      const linkDoc = linkResult.cursor?.firstBatch?.[0];
      if (!linkDoc || linkDoc.status !== 'ACTIVE') {
        return res.status(404).json({
          error: 'Link no encontrado o inactivo',
          code: 'LINK_NOT_FOUND',
        });
      }

      const tipsterId = linkDoc.tipster_id;
      const houseId = linkDoc.house_id;

      // Get IP
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || '';

      // Detect country
      const countryCode = await getCountryFromIp(ip);

      // Record click and get redirect info
      const result = await this.affiliateService.recordClick(
        tipsterId,
        houseId,
        ip,
        countryCode || undefined,
        userAgent,
        referer,
      );

      if (result.wasBlocked) {
        // Get alternative houses for the user's country
        const alternatives = countryCode
          ? await this.affiliateService.getHousesForCountry(countryCode)
          : [];

        return res.status(403).json({
          error: result.blockReason,
          code: 'COUNTRY_BLOCKED',
          houseName: result.house.name,
          countryCode,
          alternatives: alternatives.slice(0, 5).map(h => ({
            name: h.name,
            slug: h.slug,
            logoUrl: h.logoUrl,
          })),
        });
      }

      // Redirect to the betting house
      return res.redirect(302, result.redirectUrl!);
      
    } catch (error: any) {
      console.error('Redirect error:', error);
      return res.status(500).json({
        error: 'Error al procesar el enlace',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * API endpoint to get redirect info without actually redirecting
   * Useful for frontend to show house info before redirect
   */
  @Public()
  @Get(':redirectCode/info')
  async getRedirectInfo(
    @Param('redirectCode') redirectCode: string,
    @Req() req: Request,
  ) {
    const linkResult = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_links',
      filter: { redirect_code: redirectCode },
      limit: 1,
    }) as any;

    const linkDoc = linkResult.cursor?.firstBatch?.[0];
    if (!linkDoc || linkDoc.status !== 'ACTIVE') {
      return {
        valid: false,
        error: 'Link no encontrado o inactivo',
      };
    }

    // Try to find house by ObjectId or string
    let houseResult = await this.prisma.$runCommandRaw({
      find: 'betting_houses',
      filter: { _id: { $oid: linkDoc.house_id } },
      limit: 1,
    }) as any;

    let house = houseResult.cursor?.firstBatch?.[0];
    
    // If not found, try as string
    if (!house) {
      houseResult = await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: linkDoc.house_id },
        limit: 1,
      }) as any;
      house = houseResult.cursor?.firstBatch?.[0];
    }

    if (!house || house.status !== 'ACTIVE') {
      return {
        valid: false,
        error: 'Casa de apuestas no disponible',
      };
    }

    // Get tipster info
    let tipsterName = 'Tipster';
    try {
      const tipsterResult = await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { _id: { $oid: linkDoc.tipster_id } },
        limit: 1,
      }) as any;
      const tipster = tipsterResult.cursor?.firstBatch?.[0];
      if (tipster) {
        tipsterName = tipster.public_name || 'Tipster';
      }
    } catch (e) {
      // Ignore tipster lookup errors
    }

    // Get IP for country check
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '';
    const countryCode = await getCountryFromIp(ip);

    // Check if country is allowed
    let isAllowed = true;
    let blockReason: string | null = null;
    const allowedCountries = house.allowed_countries || [];
    const blockedCountries = house.blocked_countries || [];

    if (countryCode) {
      if (allowedCountries.length > 0 && !allowedCountries.includes(countryCode)) {
        isAllowed = false;
        blockReason = `Esta casa de apuestas no está disponible en tu país (${countryCode})`;
      } else if (blockedCountries.includes(countryCode)) {
        isAllowed = false;
        blockReason = `Esta casa de apuestas no está disponible en tu país (${countryCode})`;
      }
    }

    // Check if this is a demo/test house (by slug containing "test" or master URL containing "test")
    const isDemo = house.slug?.toLowerCase().includes('test') || 
                   house.master_affiliate_url?.toLowerCase().includes('test') ||
                   house.name?.toLowerCase().includes('test');

    return {
      valid: true,
      house: {
        name: house.name,
        slug: house.slug,
        logoUrl: house.logo_url,
        websiteUrl: house.website_url,
      },
      tipster: {
        name: tipsterName,
      },
      countryCode,
      isAllowed,
      blockReason,
      isDemo,
    };
  }

  /**
   * Create a demo conversion for testing the affiliate system
   */
  @Public()
  @Post(':redirectCode/demo-conversion')
  async createDemoConversion(
    @Param('redirectCode') redirectCode: string,
    @Req() req: Request,
    @Body() body: { email?: string; telegram?: string; name?: string },
  ) {
    this.logger.log(`Creating demo conversion for code: ${redirectCode}`);

    // Find the link
    const linkResult = await this.prisma.$runCommandRaw({
      find: 'tipster_affiliate_links',
      filter: { redirect_code: redirectCode },
      limit: 1,
    }) as any;

    const linkDoc = linkResult.cursor?.firstBatch?.[0];
    if (!linkDoc || linkDoc.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Link no encontrado o inactivo',
      };
    }

    const tipsterId = linkDoc.tipster_id;
    const houseId = linkDoc.house_id;

    // Get house info for commission
    let house: any = null;
    try {
      const houseResult = await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: { $oid: houseId } },
        limit: 1,
      }) as any;
      house = houseResult.cursor?.firstBatch?.[0];
    } catch (e) {
      // Try as string
      const houseResult = await this.prisma.$runCommandRaw({
        find: 'betting_houses',
        filter: { _id: houseId },
        limit: 1,
      }) as any;
      house = houseResult.cursor?.firstBatch?.[0];
    }

    // Get IP and country
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '';
    const countryCode = await getCountryFromIp(ip);

    // Create the conversion record
    const now = new Date().toISOString();
    const conversionId = new ObjectId();
    const commissionCents = house?.commission_per_referral_cents || 2500; // Default €25

    await this.prisma.$runCommandRaw({
      insert: 'affiliate_conversions',
      documents: [{
        _id: conversionId,
        house_id: houseId,
        tipster_id: tipsterId,
        tipster_tracking_id: tipsterId,
        external_ref_id: `DEMO-${Date.now()}`,
        user_email: body.email || null,
        user_telegram: body.telegram || null,
        country_code: countryCode || 'DEMO',
        event_type: 'REGISTER',
        status: 'PENDING',
        amount_cents: 0,
        currency: 'EUR',
        commission_cents: commissionCents,
        clicked_at: { $date: now },
        occurred_at: { $date: now },
        imported_at: { $date: now },
        raw_data: {
          demo: true,
          name: body.name,
          email: body.email,
          telegram: body.telegram,
          ip: ip,
          redirectCode: redirectCode,
        },
        created_at: { $date: now },
        updated_at: { $date: now },
      }],
    });

    // Update link referral count
    await this.prisma.$runCommandRaw({
      update: 'tipster_affiliate_links',
      updates: [{
        q: { _id: { $oid: linkDoc._id.$oid || linkDoc._id } },
        u: { $inc: { total_referrals: 1 } },
      }],
    });

    this.logger.log(`Demo conversion created: ${conversionId.toHexString()} for tipster ${tipsterId}`);

    return {
      success: true,
      conversionId: conversionId.toHexString(),
      message: 'Conversión de demo registrada exitosamente',
    };
  }
}
