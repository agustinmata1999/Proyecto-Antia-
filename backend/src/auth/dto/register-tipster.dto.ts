import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTipsterDto {
  @ApiProperty({ example: 'Fausto Perez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'tipster@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+34611111111' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '@tipstername', required: false })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ example: 'ES', required: false })
  @IsOptional()
  @IsString()
  countryIso?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;
}
