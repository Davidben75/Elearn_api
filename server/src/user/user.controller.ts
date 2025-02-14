import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../common/guard';
import { StatusActiveGuard } from '../common/guard/status.guard';
import { UserService } from './user.service';
import { LearnerRegisterDto, UpdatePasswordDto, UpdateUserDto } from './dto';
import { successResponse } from '../utils';
import { IUserWithRole } from '../common/interfaces';
import { Roles } from '../common/decorators';
import { GetUser } from '../common/decorators';

@UseGuards(JwtAuthGuard, RoleGuard, StatusActiveGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  // -------------
  // TUTOR ACTION
  // -------------

  // Add new learner only for tutor
  @Roles('tutor')
  @UseGuards(RoleGuard)
  @Post('tutor/add-learner')
  @HttpCode(201)
  async addNewLearner(
    @Body() learnerRegisterDto: LearnerRegisterDto,
    @Req() req: any,
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
  async getMe(@GetUser() user: IUserWithRole) {
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
  async updatePassword(@Body() dto: UpdatePasswordDto, @Req() req: any) {
    const user = req.user as IUserWithRole;
    try {
      const updatedUser = await this.userService.updatePassword(dto, user.id);
      return successResponse(updatedUser, 'Password updated successfully', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('update-info')
  @HttpCode(200)
  async updateInfo(@Body() dto: UpdateUserDto, @Req() req: any) {
    const userId = req.user.id;
    try {
      const updatedUser = await this.userService.updateUserInfo(userId, dto);
      return successResponse(updatedUser, 'User updated successfully', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('delete/:id')
  @HttpCode(200)
  async delete(@Req() req: any, @Param('id') id: number) {
    const user = req.user;
    try {
      const deletedUser = await this.userService.deleteUserAccount(id, user);
      return successResponse(deletedUser, 'User deleted successfully', 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -------------
  // ADMIN ACTIONS
  // -------------
  @Patch('suspended/:id')
  @HttpCode(200)
  @Roles('admin')
  async adminSuspendUser(@Req() req: any, @Param('id') id: number) {
    try {
      const admin = req.user;
      const userSuspended = await this.userService.toggleUserSuspension(
        id,
        admin,
      );
      const { user, message } = userSuspended;
      return successResponse(user, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('all')
  @HttpCode(200)
  @Roles('admin')
  async adminGetAllUsers() {
    try {
      const users = await this.userService.getAllUsers();
      console.log('CONTROLLER', users);
      return successResponse(users, 'Success', 200);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
