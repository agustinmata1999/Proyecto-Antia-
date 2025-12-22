import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PayoutsModule } from './payouts/payouts.module';
import { HousesModule } from './houses/houses.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TicketsModule } from './tickets/tickets.module';
import { BotModule } from './bot/bot.module';
import { TelegramModule } from './telegram/telegram.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CommissionsModule } from './commissions/commissions.module';
import { SettlementsModule } from './settlements/settlements.module';
import { AdminModule } from './admin/admin.module';
import { CurrencyModule } from './currency/currency.module';
import { ReportsModule } from './reports/reports.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { ClientModule } from './client/client.module';
import { SupportModule } from './support/support.module';
import { TipsterModule } from './tipster/tipster.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    ReferralsModule,
    PayoutsModule,
    HousesModule,
    WebhooksModule,
    TicketsModule,
    BotModule,
    TelegramModule,
    CheckoutModule,
    CommissionsModule,
    SettlementsModule,
    AdminModule,
    CurrencyModule,
    ReportsModule,
    AffiliateModule,
    ClientModule,
    SupportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
