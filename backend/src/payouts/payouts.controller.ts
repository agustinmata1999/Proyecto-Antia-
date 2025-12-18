import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayoutsService } from './payouts.service';

@ApiTags('payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Get('my')
  @Roles('TIPSTER')
  async getMyPayouts(@CurrentUser() user: any) {
    return this.payoutsService.getByTipster(user.tipsterProfile.id);
  }
}
