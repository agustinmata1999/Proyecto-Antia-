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

  @ApiProperty({ example: '@tipstername', description: 'Usuario de Telegram del tipster' })
  @IsString()
  telegramUsername: string;

  @ApiProperty({ example: '123456789', description: 'ID de Telegram vinculado durante el registro', required: false })
  @IsOptional()
  @IsString()
  telegramUserId?: string;

  @ApiProperty({ example: '@username', description: 'Username de Telegram vinculado', required: false })
  @IsOptional()
  @IsString()
  telegramLinkedUsername?: string;

  @ApiProperty({
    example: 'https://t.me/mi_canal o @mi_instagram',
    description: 'Canal/URL donde promociona (Telegram público, Instagram, etc.)',
  })
  @IsString()
  promotionChannel: string;

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
