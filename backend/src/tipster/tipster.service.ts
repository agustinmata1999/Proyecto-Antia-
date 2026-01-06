import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateKycDto } from './dto/update-kyc.dto';

@Injectable()
export class TipsterService {
  private readonly logger = new Logger(TipsterService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const result = (await this.prisma.$runCommandRaw({
      find: 'tipster_profiles',
      filter: { user_id: userId },
      limit: 1,
    })) as any;

    const profiles = result?.cursor?.firstBatch || [];
    if (profiles.length === 0) {
      throw new NotFoundException('Tipster profile not found');
    }

    return profiles[0];
  }

  async updateKyc(userId: string, dto: UpdateKycDto) {
    this.logger.log(`Updating KYC for user ${userId}`);

    // Verificar que el tipster existe
    const profile = await this.getProfile(userId);

    // Verificar que está aprobado o es un tipster legacy activo
    let userIsActive = false;
    try {
      const userResult = (await this.prisma.$runCommandRaw({
        find: 'users',
        filter: { id: userId },
        projection: { status: 1 },
        limit: 1,
      })) as any;
      const user = userResult?.cursor?.firstBatch?.[0];
      userIsActive = user?.status === 'ACTIVE';
    } catch (e) {
      this.logger.warn(`Could not check user status: ${e.message}`);
    }

    const isApproved = profile.application_status === 'APPROVED';
    const isLegacyActiveTipster = !profile.application_status && userIsActive;

    if (!isApproved && !isLegacyActiveTipster) {
      throw new BadRequestException(
        'Tu cuenta debe estar aprobada antes de completar los datos de cobro',
      );
    }

    const now = new Date().toISOString();

    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [
        {
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
        },
      ],
    });

    this.logger.log(`KYC completed for user ${userId}`);

    return {
      success: true,
      message: 'Datos de cobro actualizados correctamente',
    };
  }

  async getKycStatus(userId: string) {
    const profile = await this.getProfile(userId);

    // Para tipsters antiguos sin application_status, verificamos si el usuario está activo
    // mediante una consulta al usuario
    let userIsActive = false;
    try {
      const userResult = (await this.prisma.$runCommandRaw({
        find: 'users',
        filter: { id: userId },
        projection: { status: 1 },
        limit: 1,
      })) as any;
      const user = userResult?.cursor?.firstBatch?.[0];
      userIsActive = user?.status === 'ACTIVE';
    } catch (e) {
      this.logger.warn(`Could not check user status: ${e.message}`);
    }

    // needsKyc es true si:
    // 1. El tipster está aprobado (application_status === 'APPROVED') Y no tiene KYC completado
    // 2. O si es un tipster legacy (sin application_status) pero el usuario está activo Y no tiene KYC completado
    const isApproved = profile.application_status === 'APPROVED';
    const isLegacyActiveTipster = !profile.application_status && userIsActive;
    const needsKyc = (isApproved || isLegacyActiveTipster) && !profile.kyc_completed;

    return {
      kycCompleted: profile.kyc_completed || false,
      kycCompletedAt: profile.kyc_completed_at || null,
      applicationStatus: profile.application_status || (userIsActive ? 'LEGACY_ACTIVE' : 'UNKNOWN'),
      needsKyc,
      kycData: profile.kyc_completed
        ? {
            legalName: profile.legal_name,
            documentType: profile.document_type,
            documentNumber: profile.document_number
              ? `****${profile.document_number.slice(-4)}`
              : null,
            country: profile.country,
            bankAccountType: profile.bank_account_type,
          }
        : null,
    };
  }
}
