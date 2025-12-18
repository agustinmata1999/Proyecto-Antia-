import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HousesService } from './houses.service';

@ApiTags('houses')
@Controller('houses')
export class HousesController {
  constructor(private housesService: HousesService) {}

  @Public()
  @Get()
  async findAll() {
    return this.housesService.findAll();
  }
}
