import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { AuthService } from './auth.service';
import { successResponse } from '../utils';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() registerDto: RegisterDto) {
    try {
      const newUser = await this.authService.register(registerDto);
      return successResponse(newUser, 'User created successfully', 201);
    } catch (error) {
      console.log('error AUTH', error);
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(error.message || 'Bad Request');
      }
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    try {
      const token = await this.authService.login(loginDto);
      return successResponse(token, 'Login successful', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
