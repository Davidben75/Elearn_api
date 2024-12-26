import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../auth/guard';
import { StatusActiveGuard } from '../auth/guard/status.guard';
import { UserService } from './user.service';
import { LearnerRegisterDto, UpdatePasswordDto } from './dto';
import { successResponse } from '../common/utils/';
import { Roles } from 'src/common/utils';
import { UserWithRole } from 'src/auth/dto';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  // -------------
  // TUTOR ACTION
  // -------------
  @Roles('tutor')
  @UseGuards(RoleGuard, StatusActiveGuard)
  @Post('tutor/add-learner')
  @HttpCode(201)
  async addNewLearner(
    @Body() learnerRegisterDto: LearnerRegisterDto,
    @Req() req,
  ) {
    const tutor = req.user;
    console.log(tutor);
    try {
      const user = await this.userService.createLearner(
        learnerRegisterDto,
        tutor,
      );

      console.log(user);
      return successResponse(user, 'User created successfully', 201);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -------------
  // USER PUBLIC ACTIONS
  // -------------
  @Get('me')
  @UseGuards(StatusActiveGuard)
  @HttpCode(200)
  async getMe(@Req() req) {
    try {
      const user = req.user;
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }
      return successResponse(user, 'User found successfully', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put('update-password')
  @HttpCode(200)
  async updatePassword(@Body() dto: UpdatePasswordDto, @Req() req) {
    const user = req.user as UserWithRole;
    console.log(user);
    try {
      const updatedUser = await this.userService.updatePassword(
        dto,
        user.email,
      );

      return successResponse(updatedUser, 'Password updated successfully', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -------------
  // ADMIN ACTIONS
  // -------------
}
