import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(
    private referralsService: ReferralsService,
    private prisma: PrismaService,
  ) {}

  @Get('links')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get referral links (Tipster only)' })
  async getLinks(@CurrentUser() user: any) {
    return this.referralsService.getLinks(user.tipsterProfile.id);
  }

  @Get('metrics')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get referral metrics (Tipster only)' })
  async getMetrics(@CurrentUser() user: any, @Query('range') range?: string) {
    // Get tipster profile
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (!tipsterProfile) {
      return {
        clicks: 0,
        registers: 0,
        ftds: 0,
        deposits: 0,
        totalDeposits: 0,
        conversionRate: 0,
      };
    }
    
    return this.referralsService.getMetrics(tipsterProfile.id);
  }

  @Get('commissions')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get commissions (Tipster only)' })
  async getCommissions(@CurrentUser() user: any) {
    return this.referralsService.getCommissions(user.tipsterProfile.id);
  }
}
