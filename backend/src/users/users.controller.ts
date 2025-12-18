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
    return this.usersService.findById(user.id);
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
        affiliate: tipster.moduleAffiliate === true,  // default false
      },
      isTipster: true,
    };
  }
}
