import { Module } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { LandingService } from './landing.service';
import { AffiliateAdminController } from './affiliate-admin.controller';
import { AffiliateTipsterController } from './affiliate-tipster.controller';
import { AffiliateRedirectController } from './affiliate-redirect.controller';
import { 
  LandingPublicController, 
  LandingRedirectController, 
  TipsterLandingController 
} from './landing.controller';
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
  ],
  providers: [AffiliateService, LandingService],
  exports: [AffiliateService, LandingService],
})
export class AffiliateModule {}
