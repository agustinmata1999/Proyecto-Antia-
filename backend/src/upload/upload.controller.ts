import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Logger,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';

// Ensure upload directories exist
const ticketsDir = join(process.cwd(), 'uploads', 'tickets');
const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
const campaignsDir = join(process.cwd(), 'uploads', 'campaigns');
if (!existsSync(ticketsDir)) {
  mkdirSync(ticketsDir, { recursive: true });
}
if (!existsSync(avatarsDir)) {
  mkdirSync(avatarsDir, { recursive: true });
}
if (!existsSync(campaignsDir)) {
  mkdirSync(campaignsDir, { recursive: true });
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private prisma: PrismaService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: avatarsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max for avatar
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)'), false);
        }
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const userId = req.user.id;
    const baseUrl = process.env.APP_URL || 'http://localhost:8001';
    const avatarUrl = `${baseUrl}/api/uploads/avatars/${file.filename}`;

    // Update the tipster profile with the new avatar URL
    try {
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [
          {
            q: { user_id: userId },
            u: { $set: { avatar_url: avatarUrl, updated_at: { $date: new Date().toISOString() } } },
          },
        ],
      });
      this.logger.log(`Avatar uploaded for user ${userId}: ${avatarUrl}`);
    } catch (error) {
      this.logger.error('Error updating avatar URL:', error);
    }

    return {
      success: true,
      avatarUrl,
      file: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload files for support tickets' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: ticketsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `ticket-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Tipo de archivo no permitido'), false);
        }
      },
    }),
  )
  async uploadTicketFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:8001';
    const urls = files.map((file) => `${baseUrl}/api/uploads/tickets/${file.filename}`);

    this.logger.log(`Uploaded ${files.length} files for ticket`);

    return {
      success: true,
      urls,
      files: files.map((f) => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
      })),
    };
  }

  @Post('campaign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload campaign cover image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: campaignsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `campaign-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max for campaign image
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)'), false);
        }
      },
    }),
  )
  async uploadCampaignImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:8001';
    const imageUrl = `${baseUrl}/api/uploads/campaigns/${file.filename}`;

    this.logger.log(`Campaign image uploaded by user ${req.user.id}: ${imageUrl}`);

    return {
      success: true,
      imageUrl,
      file: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
    };
  }
}
