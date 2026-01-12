import { Module } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController, AdminWithdrawalsController, InvoicesController } from './withdrawals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WithdrawalsController, AdminWithdrawalsController, InvoicesController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
