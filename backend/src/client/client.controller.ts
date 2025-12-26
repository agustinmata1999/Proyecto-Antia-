import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientService } from './client.service';

@ApiTags('Client')
@Controller('client')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
@ApiBearerAuth()
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get client profile' })
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.clientService.getProfile(user.id);
    
    return {
      profile,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update client profile' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() body: {
      countryIso?: string;
      telegramUserId?: string;
      locale?: string;
      timezone?: string;
    },
  ) {
    return this.clientService.updateProfile(user.id, body);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Get all purchases' })
  async getPurchases(@CurrentUser() user: any) {
    return this.clientService.getPurchases(user.id);
  }

  @Get('purchases/:id')
  @ApiOperation({ summary: 'Get purchase details' })
  async getPurchaseDetails(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const details = await this.clientService.getPurchaseDetails(user.id, id);
    
    if (!details) {
      return { error: 'Compra no encontrada' };
    }
    
    return details;
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all active subscriptions' })
  async getSubscriptions(@CurrentUser() user: any) {
    return this.clientService.getSubscriptions(user.id);
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  async cancelSubscription(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.clientService.cancelSubscription(user.id, id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  async getPaymentHistory(@CurrentUser() user: any) {
    return this.clientService.getPaymentHistory(user.id);
  }
}
