import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterClientDto {
  @ApiProperty({ example: 'client@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+34622222222', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'ES' })
  @IsString()
  countryIso: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  consent18: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  consentTerms: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  consentPrivacy: boolean;
}
