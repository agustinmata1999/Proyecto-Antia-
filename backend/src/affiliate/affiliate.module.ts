import { Module } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { LandingService } from './landing.service';
import { PromotionService } from './promotion.service';
import { AffiliateAdminController } from './affiliate-admin.controller';
import { AffiliateTipsterController } from './affiliate-tipster.controller';
import { AffiliateRedirectController } from './affiliate-redirect.controller';
import {
  LandingPublicController,
  LandingRedirectController,
  TipsterLandingController,
} from './landing.controller';
import { PromotionAdminController, PromotionPublicController } from './promotion.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AffiliateAdminController,
    AffiliateTipsterController,
    AffiliateRedirectController,
    LandingPublicController,
    LandingRedirectController,
    TipsterLandingController,
    PromotionAdminController,
    PromotionPublicController,
  ],
  providers: [AffiliateService, LandingService, PromotionService],
  exports: [AffiliateService, LandingService, PromotionService],
})
export class AffiliateModule {}
