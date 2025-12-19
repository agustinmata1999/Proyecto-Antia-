import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { RegisterTipsterDto, RegisterClientDto, LoginDto } from './dto';
import { UserPayload } from '../common/interfaces/user-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Check user status with specific messages
    if (user.status === 'PENDING') {
      if (user.role === 'TIPSTER') {
        throw new UnauthorizedException({
          message: 'Tu solicitud de tipster está pendiente de aprobación. Te notificaremos cuando sea revisada.',
          code: 'PENDING_APPROVAL',
          status: 'PENDING',
        });
      }
      throw new UnauthorizedException('Tu cuenta está pendiente de activación');
    }
    
    if (user.status === 'REJECTED') {
      throw new UnauthorizedException({
        message: 'Tu solicitud de registro ha sido rechazada. Contacta a soporte para más información.',
        code: 'REJECTED',
        status: 'REJECTED',
      });
    }
    
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Tu cuenta ha sido suspendida. Contacta a soporte.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tu cuenta no está activa');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async registerTipster(dto: RegisterTipsterDto) {
    // Check if email exists using raw query
    const existingResult = await this.prisma.$runCommandRaw({
      find: 'users',
      filter: { email: dto.email },
      limit: 1,
    }) as any;

    if (existingResult.cursor?.firstBatch?.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const now = new Date().toISOString();
      const userId = new ObjectId();
      const tipsterProfileId = new ObjectId();

      // Create user using raw MongoDB with PENDING status (requires admin approval)
      await this.prisma.$runCommandRaw({
        insert: 'users',
        documents: [{
          _id: userId,
          email: dto.email,
          phone: dto.phone,
          password_hash: passwordHash,
          role: 'TIPSTER',
          status: 'PENDING', // Requires admin approval
          created_at: { $date: now },
          updated_at: { $date: now },
        }],
      });

      // Create tipster profile with application details
      await this.prisma.$runCommandRaw({
        insert: 'tipster_profiles',
        documents: [{
          _id: tipsterProfileId,
          user_id: userId.toHexString(),
          public_name: dto.name,
          telegram_username: dto.telegramUsername || null,
          locale: 'es',
          timezone: 'Europe/Madrid',
          module_forecasts: true,
          module_affiliate: false,
          // Application details
          application_status: 'PENDING',
          application_notes: dto.applicationNotes || null,
          application_country: dto.countryIso || null,
          application_experience: dto.experience || null,
          application_social_media: dto.socialMedia || null,
          application_website: dto.website || null,
          created_at: { $date: now },
          updated_at: { $date: now },
        }],
      });

      this.logger.log(`New tipster application received: ${dto.email}`);

      return {
        message: 'Solicitud de registro enviada correctamente. Un administrador revisará tu solicitud.',
        userId: userId.toHexString(),
        status: 'PENDING',
        requiresApproval: true,
      };
    } catch (error) {
      console.error('Error registering tipster:', error);
      throw new Error('Error creating tipster account');
    }
  }

  async registerClient(dto: RegisterClientDto) {
    // Check if email exists using raw query
    const existingResult = await this.prisma.$runCommandRaw({
      find: 'users',
      filter: { email: dto.email },
      limit: 1,
    }) as any;

    if (existingResult.cursor?.firstBatch?.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const now = new Date().toISOString();
      const userId = new ObjectId();
      const clientProfileId = new ObjectId();

      // Create user using raw MongoDB
      await this.prisma.$runCommandRaw({
        insert: 'users',
        documents: [{
          _id: userId,
          email: dto.email,
          phone: dto.phone || null,
          password_hash: passwordHash,
          role: 'CLIENT',
          status: 'ACTIVE',
          created_at: { $date: now },
          updated_at: { $date: now },
        }],
      });

      // Create client profile using raw MongoDB
      await this.prisma.$runCommandRaw({
        insert: 'client_profiles',
        documents: [{
          _id: clientProfileId,
          user_id: userId.toHexString(),
          country_iso: dto.countryIso,
          consent_18: dto.consent18 || false,
          consent_terms: dto.consentTerms || false,
          consent_privacy: dto.consentPrivacy || false,
          locale: 'es',
          timezone: 'Europe/Madrid',
          created_at: { $date: now },
          updated_at: { $date: now },
        }],
      });

      // Return login data
      const user = {
        id: userId.toHexString(),
        email: dto.email,
        role: 'CLIENT',
        status: 'ACTIVE',
      };

      return this.login(user);
    } catch (error) {
      console.error('Error registering client:', error);
      throw new Error('Error creating client account');
    }
  }

  async sendOtp(email: string, kind: 'EMAIL' | 'PHONE') {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    // Save OTP
    await this.prisma.otpToken.create({
      data: {
        kind,
        delivery: 'EMAIL',
        codeHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // TODO: Send email with code (simulated for now)
    console.log(`OTP Code for ${email}: ${code}`);

    return {
      message: 'OTP sent successfully',
      // In development, return code (REMOVE IN PRODUCTION)
      ...(process.env.NODE_ENV === 'development' && { code }),
    };
  }

  async verifyOtp(code: string) {
    const tokens = await this.prisma.otpToken.findMany({
      where: {
        usedAt: null,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    for (const token of tokens) {
      const isValid = await bcrypt.compare(code, token.codeHash);
      if (isValid) {
        await this.prisma.otpToken.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        });
        return { valid: true };
      }
    }

    throw new UnauthorizedException('Invalid or expired OTP');
  }

  generateShortToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SHORT_SECRET'),
      expiresIn: this.config.get('JWT_SHORT_EXPIRES_IN', '15m'),
    });
  }

  verifyShortToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.config.get('JWT_SHORT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
