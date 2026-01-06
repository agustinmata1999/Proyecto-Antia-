import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeoLocationResult {
  country: string; // Country code (ES, US, etc.)
  countryName: string;
  city?: string;
  region?: string;
  ip: string;
  isSpain: boolean;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  constructor(private config: ConfigService) {}

  /**
   * Detect country from IP address using ip-api.com (free, no API key)
   */
  async detectCountry(ip: string): Promise<GeoLocationResult> {
    try {
      // Clean the IP (remove IPv6 prefix if present)
      const cleanIp = ip.replace('::ffff:', '');

      // Skip localhost/private IPs
      if (this.isPrivateIP(cleanIp)) {
        this.logger.warn(`Private IP detected: ${cleanIp}, defaulting to Spain`);
        return this.getDefaultResult(cleanIp, 'ES');
      }

      // Call ip-api.com (free, no API key needed)
      const response = await fetch(
        `http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city`,
      );
      const data = await response.json();

      if (data.status === 'success') {
        const result: GeoLocationResult = {
          country: data.countryCode,
          countryName: data.country,
          city: data.city,
          region: data.regionName,
          ip: cleanIp,
          isSpain: data.countryCode === 'ES',
        };

        this.logger.log(`Geolocation for ${cleanIp}: ${data.countryCode} (${data.country})`);
        return result;
      }

      this.logger.warn(`Geolocation failed for ${cleanIp}: ${data.message}`);
      return this.getDefaultResult(cleanIp, 'ES');
    } catch (error) {
      this.logger.error(`Geolocation error for ${ip}:`, error);
      // Default to Spain if geolocation fails
      return this.getDefaultResult(ip, 'ES');
    }
  }

  /**
   * Check if IP is private/localhost
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^127\./, // Localhost
      /^10\./, // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^192\.168\./, // Private Class C
      /^::1$/, // IPv6 localhost
      /^localhost$/i,
      /^$/, // Empty
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Get default result when geolocation fails
   */
  private getDefaultResult(ip: string, defaultCountry: string = 'ES'): GeoLocationResult {
    return {
      country: defaultCountry,
      countryName: defaultCountry === 'ES' ? 'Spain' : 'Unknown',
      ip,
      isSpain: defaultCountry === 'ES',
    };
  }
}
