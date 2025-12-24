import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './emails.service';
import { EmailTemplatesService } from './email-templates.service';
import { EmailsController } from './emails.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService, EmailTemplatesService],
  controllers: [EmailsController],
  exports: [EmailService, EmailTemplatesService],
})
export class EmailsModule {}
