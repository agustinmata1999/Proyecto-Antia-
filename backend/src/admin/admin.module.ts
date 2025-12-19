import { Module } from '@nestjs/common';
import { AdminTipstersController } from './admin-tipsters.controller';
import { AdminApplicationsController } from './admin-applications.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTipstersController, AdminApplicationsController],
})
export class AdminModule {}
