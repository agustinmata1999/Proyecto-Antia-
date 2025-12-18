import { Module } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { AffiliateAdminController } from './affiliate-admin.controller';
import { AffiliateTipsterController } from './affiliate-tipster.controller';
import { AffiliateRedirectController } from './affiliate-redirect.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AffiliateAdminController,
    AffiliateTipsterController,
    AffiliateRedirectController,
  ],
  providers: [AffiliateService],
  exports: [AffiliateService],
})
export class AffiliateModule {}
