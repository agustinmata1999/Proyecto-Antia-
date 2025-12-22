import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TipsterService } from './tipster.service';
import { UpdateKycDto } from './dto/update-kyc.dto';

@ApiTags('tipster')
@Controller('tipster')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TipsterController {
  constructor(private tipsterService: TipsterService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get tipster profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.tipsterService.getProfile(user.id);
  }

  @Get('kyc-status')
  @ApiOperation({ summary: 'Get KYC completion status' })
  async getKycStatus(@CurrentUser() user: any) {
    return this.tipsterService.getKycStatus(user.id);
  }

  @Put('kyc')
  @ApiOperation({ summary: 'Complete KYC / payment data' })
  async updateKyc(
    @CurrentUser() user: any,
    @Body() dto: UpdateKycDto,
  ) {
    return this.tipsterService.updateKyc(user.id, dto);
  }
}
