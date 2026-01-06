import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Public()
  @Post('payments/confirm')
  async paymentConfirm(@Body() data: any, @Headers('x-webhook-signature') signature: string) {
    // In production, verify signature
    // const isValid = this.webhooksService.verifySignature(JSON.stringify(data), signature);
    // if (!isValid) throw new UnauthorizedException('Invalid signature');

    return this.webhooksService.handlePaymentConfirm(data);
  }
}
