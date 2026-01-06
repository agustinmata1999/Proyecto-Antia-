import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: any) {
    const userData = await this.usersService.findById(user.id);

    if (!userData) return null;

    // Remove sensitive data
    const { passwordHash, password_hash, ...safeUserData } = userData as any;

    // If user is a tipster, include tipster profile with KYC status
    if (userData?.role === 'TIPSTER') {
      const result = (await this.prisma.$runCommandRaw({
        find: 'tipster_profiles',
        filter: { user_id: user.id },
        limit: 1,
      })) as any;

      const profiles = result?.cursor?.firstBatch || [];
      const tipsterProfile = profiles[0] || null;

      // Clean sensitive KYC data for response
      if (tipsterProfile) {
        // Mask document number if present
        if (tipsterProfile.document_number) {
          tipsterProfile.document_number_masked = `****${tipsterProfile.document_number.slice(-4)}`;
        }
        // Add KYC status
        tipsterProfile.needsKyc =
          tipsterProfile.application_status === 'APPROVED' && !tipsterProfile.kyc_completed;
      }

      return {
        ...safeUserData,
        tipsterProfile,
      };
    }

    // If user is a client, include client profile
    if (userData?.role === 'CLIENT') {
      const result = (await this.prisma.$runCommandRaw({
        find: 'client_profiles',
        filter: { user_id: user.id },
        limit: 1,
      })) as any;

      const profiles = result?.cursor?.firstBatch || [];
      const clientProfile = profiles[0] || null;

      return {
        ...safeUserData,
        clientProfile,
      };
    }

    return safeUserData;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@CurrentUser() user: any, @Body() data: any) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Get('me/modules')
  @ApiOperation({ summary: 'Get enabled modules for tipster' })
  async getMyModules(@CurrentUser() user: any) {
    // Find tipster profile
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        modules: {
          forecasts: false,
          affiliate: false,
        },
        isTipster: false,
      };
    }

    return {
      modules: {
        forecasts: tipster.moduleForecasts !== false, // default true
        affiliate: tipster.moduleAffiliate === true, // default false
      },
      isTipster: true,
    };
  }
}
