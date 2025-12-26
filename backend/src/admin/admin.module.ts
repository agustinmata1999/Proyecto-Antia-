import { Module } from '@nestjs/common';
import { AdminTipstersController } from './admin-tipsters.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { AdminSalesController } from './admin-sales.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTipstersController, AdminApplicationsController, AdminSalesController],
})
export class AdminModule {}
