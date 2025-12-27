import { IsString, IsOptional, IsNumber, IsArray, IsDate, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

// Betting House DTOs
export class CreateBettingHouseDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsString()
  masterAffiliateUrl: string;

  @IsOptional()
  @IsString()
  trackingParamName?: string;

  @IsNumber()
  commissionPerReferralCents: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedCountries?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsObject()
  csvColumnMapping?: Record<string, string>;
}

export class UpdateBettingHouseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  masterAffiliateUrl?: string;

  @IsOptional()
  @IsString()
  trackingParamName?: string;

  @IsOptional()
  @IsNumber()
  commissionPerReferralCents?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedCountries?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsObject()
  csvColumnMapping?: Record<string, string>;
}

// Campaign DTOs
export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  houseIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  houseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

// CSV Import DTOs
export class ImportCsvDto {
  @IsString()
  houseId: string;

  @IsString()
  periodMonth: string;  // "2025-01"

  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;
}

// Standard CSV row format (internal)
export interface StandardCsvRow {
  house_id?: string;
  tipster_tracking_id: string;  // subid
  event_type: 'REGISTER' | 'DEPOSIT' | 'QUALIFIED';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  occurred_at: string;
  external_ref_id?: string;
  amount?: number;
  currency?: string;
}

// Payout DTOs
export class MarkPayoutPaidDto {
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
