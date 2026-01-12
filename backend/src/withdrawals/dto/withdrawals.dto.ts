import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty({ description: 'Amount in cents', example: 5000 })
  @IsNumber()
  @Min(500)
  amountCents: number;

  @ApiPropertyOptional({ description: 'Optional notes', example: 'Monthly withdrawal' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayWithdrawalDto {
  @ApiProperty({ description: 'Payment method used', example: 'BANK_TRANSFER' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Payment reference', example: 'REF-123456' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Admin internal notes' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class RejectWithdrawalDto {
  @ApiProperty({ description: 'Rejection reason', example: 'Invalid bank details' })
  @IsString()
  rejectionReason: string;
}

export class ApproveWithdrawalDto {
  @ApiPropertyOptional({ description: 'Admin internal notes' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
