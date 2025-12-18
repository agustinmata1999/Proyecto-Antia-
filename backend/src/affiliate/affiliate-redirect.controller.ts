import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AffiliateService } from './affiliate.service';

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
      // Find the link
      const link = await this.prisma.tipsterAffiliateLink.findUnique({
        where: { redirectCode },
      });

      if (!link || link.status !== 'ACTIVE') {
        return res.status(404).json({
          error: 'Link no encontrado o inactivo',
          code: 'LINK_NOT_FOUND',
        });
      }

      // Get IP
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || '';

      // Detect country
      const countryCode = await getCountryFromIp(ip);

      // Record click and get redirect info
      const result = await this.affiliateService.recordClick(
        link.tipsterId,
        link.houseId,
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
    const link = await this.prisma.tipsterAffiliateLink.findUnique({
      where: { redirectCode },
    });

    if (!link || link.status !== 'ACTIVE') {
      return {
        valid: false,
        error: 'Link no encontrado o inactivo',
      };
    }

    const house = await this.prisma.bettingHouse.findUnique({
      where: { id: link.houseId },
    });

    if (!house || house.status !== 'ACTIVE') {
      return {
        valid: false,
        error: 'Casa de apuestas no disponible',
      };
    }

    // Get IP for country check
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '';
    const countryCode = await getCountryFromIp(ip);

    // Check if country is allowed
    let isAllowed = true;
    let blockReason: string | null = null;

    if (countryCode) {
      if (house.allowedCountries.length > 0 && !house.allowedCountries.includes(countryCode)) {
        isAllowed = false;
        blockReason = `Esta casa de apuestas no está disponible en tu país (${countryCode})`;
      } else if (house.blockedCountries.includes(countryCode)) {
        isAllowed = false;
        blockReason = `Esta casa de apuestas no está disponible en tu país (${countryCode})`;
      }
    }

    return {
      valid: true,
      house: {
        name: house.name,
        slug: house.slug,
        logoUrl: house.logoUrl,
        websiteUrl: house.websiteUrl,
      },
      countryCode,
      isAllowed,
      blockReason,
    };
  }
}
