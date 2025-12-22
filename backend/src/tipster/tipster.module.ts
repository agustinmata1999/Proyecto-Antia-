import { Module } from '@nestjs/common';
import { TipsterController } from './tipster.controller';
import { TipsterService } from './tipster.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TipsterController],
  providers: [TipsterService],
  exports: [TipsterService],
})
export class TipsterModule {}
