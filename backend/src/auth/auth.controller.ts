import { Controller, Post, Body, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterTipsterDto, RegisterClientDto, LoginDto, SendOtpDto, VerifyOtpDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('tipster/register')
  @ApiOperation({ summary: 'Register new tipster (requires admin approval)' })
  @ApiResponse({ status: 201, description: 'Registration submitted' })
  async registerTipster(@Body() dto: RegisterTipsterDto) {
    return this.authService.registerTipster(dto);
  }

  @Public()
  @Post('client/register')
  @ApiOperation({ summary: 'Register new client' })
  @ApiResponse({ status: 201, description: 'Client registered successfully' })
  async registerClient(@Body() dto: RegisterClientDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerClient(dto);

    // Set cookie
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Logged in successfully' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(req.user);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.email, 'EMAIL');
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.code);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }
}
