import { Module } from '@nestjs/common';
import { AdminTipstersController } from './admin-tipsters.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { AdminSalesController } from './admin-sales.controller';
import { AdminSupportController } from './admin-support.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [PrismaModule, EmailsModule],
  controllers: [
    AdminTipstersController,
    AdminApplicationsController,
    AdminSalesController,
    AdminSupportController,
  ],
})
export class AdminModule {}
