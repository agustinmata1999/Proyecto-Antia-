import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateKycDto } from './dto/update-kyc.dto';

@Injectable()
export class TipsterService {
  private readonly logger = new Logger(TipsterService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { user_id: userId },
      limit: 1,
    }) as any;

    const profiles = result?.cursor?.firstBatch || [];
    if (profiles.length === 0) {
      throw new NotFoundException('Tipster profile not found');
    }

    return profiles[0];
  }

  async updateKyc(userId: string, dto: UpdateKycDto) {
    this.logger.log(`Updating KYC for user ${userId}`);

    // Verificar que el tipster existe y está aprobado
    const profile = await this.getProfile(userId);
    
    if (profile.application_status !== 'APPROVED') {
      throw new BadRequestException('Tu cuenta debe estar aprobada antes de completar los datos de cobro');
    }

    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [{
        q: { user_id: userId },
        u: {
          $set: {
            legal_name: dto.legalName,
            document_type: dto.documentType,
            document_number: dto.documentNumber,
            country: dto.country,
            bank_account_type: dto.bankAccountType,
            bank_account_details: dto.bankAccountDetails || {},
            kyc_completed: true,
            kyc_completed_at: { $date: now },
            updated_at: { $date: now },
          },
        },
      }],
    });

    this.logger.log(`KYC completed for user ${userId}`);

    return {
      success: true,
      message: 'Datos de cobro actualizados correctamente',
    };
  }

  async getKycStatus(userId: string) {
    const profile = await this.getProfile(userId);
    
    return {
      kycCompleted: profile.kyc_completed || false,
      kycCompletedAt: profile.kyc_completed_at || null,
      applicationStatus: profile.application_status,
      needsKyc: profile.application_status === 'APPROVED' && !profile.kyc_completed,
      kycData: profile.kyc_completed ? {
        legalName: profile.legal_name,
        documentType: profile.document_type,
        documentNumber: profile.document_number ? `****${profile.document_number.slice(-4)}` : null,
        country: profile.country,
        bankAccountType: profile.bank_account_type,
      } : null,
    };
  }
}
