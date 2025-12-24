import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { GeolocationService } from './geolocation.service';
import { RedsysService } from './redsys.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ConfigModule, TelegramModule, CommissionsModule, NotificationsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, GeolocationService, RedsysService],
  exports: [CheckoutService, GeolocationService, RedsysService],
})
export class CheckoutModule {}
