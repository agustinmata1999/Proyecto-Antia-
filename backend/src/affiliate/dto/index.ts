// Betting House DTOs
export class CreateBettingHouseDto {
  name: string;
  slug: string;
  logoUrl?: string;
  masterAffiliateUrl: string;
  trackingParamName?: string;
  commissionPerReferralCents: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  description?: string;
  websiteUrl?: string;
  csvColumnMapping?: Record<string, string>;
}

export class UpdateBettingHouseDto {
  name?: string;
  logoUrl?: string;
  status?: string;
  masterAffiliateUrl?: string;
  trackingParamName?: string;
  commissionPerReferralCents?: number;
  allowedCountries?: string[];
  blockedCountries?: string[];
  description?: string;
  websiteUrl?: string;
  csvColumnMapping?: Record<string, string>;
}

// Campaign DTOs
export class CreateCampaignDto {
  name: string;
  slug: string;
  description?: string;
  houseIds: string[];
  targetCountries?: string[];
  startDate?: Date;
  endDate?: Date;
}

export class UpdateCampaignDto {
  name?: string;
  description?: string;
  status?: string;
  houseIds?: string[];
  targetCountries?: string[];
  startDate?: Date;
  endDate?: Date;
}

// CSV Import DTOs
export class ImportCsvDto {
  houseId: string;
  periodMonth: string;  // "2025-01"
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
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
}
