import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKycDto {
  @ApiProperty({ example: 'Juan Pérez García', description: 'Nombre completo o Razón social' })
  @IsString()
  legalName: string;

  @ApiProperty({ example: 'DNI', description: 'Tipo de documento: DNI, NIE, PASSPORT, CIF' })
  @IsString()
  documentType: string;

  @ApiProperty({ example: '12345678A', description: 'Número de documento' })
  @IsString()
  documentNumber: string;

  @ApiProperty({ example: 'España', description: 'País de residencia fiscal' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'IBAN', description: 'Tipo de cuenta: IBAN, PAYPAL, CRYPTO, OTHER' })
  @IsString()
  bankAccountType: string;

  @ApiProperty({ 
    example: { iban: 'ES1234567890123456789012', bankName: 'Banco Ejemplo' },
    description: 'Detalles de la cuenta bancaria' 
  })
  @IsOptional()
  bankAccountDetails?: Record<string, any>;
}
