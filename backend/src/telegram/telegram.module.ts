import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramChannelsService } from './telegram-channels.service';
import { TelegramChannelsController } from './telegram-channels.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [TelegramService, TelegramChannelsService],
  controllers: [TelegramController, TelegramChannelsController],
  exports: [TelegramService, TelegramChannelsService],
})
export class TelegramModule {}
