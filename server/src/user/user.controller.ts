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
import { JwtAuthGuard, RoleGuard } from '../common/guard';
import { StatusActiveGuard } from '../common/guard/status.guard';
import { UserService } from './user.service';
import { LearnerRegisterDto, UpdatePasswordDto } from './dto';
import { successResponse } from '../utils';
import { IUserWithRole } from '../common/interfaces';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard, RoleGuard, StatusActiveGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  // -------------
  // TUTOR ACTION
  // -------------

  // Add new learner only for tutor
  @Roles('tutor')
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

  // Get user Info
  @Get('me')
  @HttpCode(200)
  async getMe(@User() user: IUserWithRole) {
    try {
      if (!user) {
        throw new UnauthorizedException('User not authenticated');
      }
      return successResponse(user, 'User found successfully', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Update password
  @Put('update-password')
  @HttpCode(200)
  async updatePassword(@Body() dto: UpdatePasswordDto, @Req() req) {
    const user = req.user as IUserWithRole;
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
