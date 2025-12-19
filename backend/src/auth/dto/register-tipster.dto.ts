import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
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

  // Campos adicionales para la solicitud
  @ApiProperty({ example: 'Quiero unirme porque...', required: false })
  @IsOptional()
  @IsString()
  applicationNotes?: string;

  @ApiProperty({ example: '2 años de experiencia en fútbol', required: false })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ example: '@mi_instagram, @mi_twitter', required: false })
  @IsOptional()
  @IsString()
  socialMedia?: string;

  @ApiProperty({ example: 'https://miwebsite.com', required: false })
  @IsOptional()
  @IsString()
  website?: string;
}
