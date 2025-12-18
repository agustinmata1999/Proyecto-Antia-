import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'ONE_TIME' })
  @IsString()
  billingType: string;

  @ApiProperty({ example: 'MONTH', required: false })
  @IsOptional()
  @IsString()
  billingPeriod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  capacityLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramChannelId?: string;

  @ApiProperty({ example: 'AUTO_JOIN', default: 'AUTO_JOIN' })
  @IsOptional()
  @IsString()
  accessMode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  validityDays?: number;
}
