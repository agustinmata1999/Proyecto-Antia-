import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BotService } from './bot.service';

@ApiTags('bot')
@Controller('bot')
export class BotController {
  constructor(private botService: BotService) {}

  @Public()
  @Post('link-validate')
  async validateLink(@Body() data: any) {
    return this.botService.validateLinkToken(data.token, data.telegram_user_id);
  }

  @Public()
  @Post('sync-purchase')
  async syncPurchase(@Body() data: any) {
    return this.botService.syncPurchase(data.telegram_user_id, data.order_ref);
  }
}
