import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramChannelsService } from './telegram-channels.service';
import { TelegramChannelsController } from './telegram-channels.controller';
import { TelegramAuthController } from './telegram-auth.controller';
import { TelegramHttpService } from './telegram-http.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [TelegramService, TelegramChannelsService, TelegramHttpService],
  controllers: [TelegramController, TelegramChannelsController, TelegramAuthController],
  exports: [TelegramService, TelegramChannelsService, TelegramHttpService],
})
export class TelegramModule {}
