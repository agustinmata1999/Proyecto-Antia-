import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SimulatorController],
})
export class SimulatorModule {}
