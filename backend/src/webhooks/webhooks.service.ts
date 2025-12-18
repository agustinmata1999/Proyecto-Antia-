import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private config: ConfigService,
  ) {}

  verifySignature(payload: string, signature: string): boolean {
    const secret = this.config.get('CHECKOUT_WEBHOOK_SECRET');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  async handlePaymentConfirm(data: any) {
    // Log webhook - Skip for now (requires WebhookLog model)
    console.log('Webhook received:', data);

    // Find order
    const order = await this.prisma.order.findFirst({
      where: {
        productId: data.product_id,
        emailBackup: data.email,
      },
    });

    if (order) {
      await this.ordersService.updateStatus(order.id, 'PAGADA');
      
      // Grant access if channel ID exists
      const product = await this.prisma.product.findUnique({
        where: { id: data.product_id },
      });

      if (product?.telegramChannelId) {
        await this.ordersService.grantAccess(
          order.id,
          order.clientUserId || data.client_user_id,
          product.telegramChannelId,
        );
      }
    }

    return { received: true };
  }
}
