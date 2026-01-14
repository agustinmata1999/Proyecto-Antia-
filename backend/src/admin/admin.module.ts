import { Module } from '@nestjs/common';
import { AdminTipstersController } from './admin-tipsters.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { AdminSalesController } from './admin-sales.controller';
import { AdminSupportController } from './admin-support.controller';
import { AdminChannelMonitorController } from './admin-channel-monitor.controller';
import { AdminChannelMonitorService } from './admin-channel-monitor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [PrismaModule, EmailsModule],
  controllers: [
    AdminTipstersController,
    AdminApplicationsController,
    AdminSalesController,
    AdminSupportController,
    AdminChannelMonitorController,
  ],
  providers: [AdminChannelMonitorService],
  exports: [AdminChannelMonitorService],
})
export class AdminModule {}
