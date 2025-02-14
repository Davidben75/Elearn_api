import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard, RoleGuard, StatusActiveGuard } from 'src/common/guard';
import { Roles } from 'src/common/decorators';
import { successResponse } from 'src/utils';
import { EnrollmentDto } from './dto/enrollment.dto';

@Controller('enrollment')
@UseGuards(JwtAuthGuard, StatusActiveGuard)
export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  @Get('list')
  @UseGuards(RoleGuard)
  @Roles('tutor')
  async findListEnrollment(@Body() courseId: number) {
    try {
      const enrollementList =
        await this.enrollmentService.fetchEnrollmentListByCourse(courseId);
      if (enrollementList.length < 0) {
        successResponse(null, 'No learner enrolle in this course', 200);
      } else {
        successResponse(enrollementList, 'Success', 200);
      }
    } catch (error) {
      console.log('ERROR IN findListEnrollment', error);
      throw new BadRequestException(
        'Something went wrong fetching enrollment list ',
      );
    }
  }

  @Post('create')
  @UseGuards(RoleGuard)
  @Roles('tutor')
  async createEnrollments(@Body() enrollmentDto: EnrollmentDto, @Req() req) {
    const tutorId = req.user.id;
    try {
      const list = await this.enrollmentService.addEnrollment(
        enrollmentDto,
        tutorId,
      );

      successResponse(list, 'Succes', 200);
    } catch (error) {
      console.log('ERROR IN findListEnrollment', error);
      throw new BadRequestException(
        'Something went wrong fetching enrollment list ',
      );
    }
  }

  @Get('assignable-learner/:courseId')
  @UseGuards(RoleGuard)
  @Roles('tutor')
  async getAssignableLearnersList(
    @Req() req,
    @Param('courseId') courseId: number,
  ) {
    const tutorId = req.user.id;
    try {
      const list = await this.enrollmentService.getAssignableLearners(
        tutorId,
        courseId,
      );

      successResponse(list, 'Succes', 200);
    } catch (error) {
      console.log('ERROR IN findListEnrollment', error);
      throw new BadRequestException(
        'Something went wrong fetching enrollment list ',
      );
    }
  }

  @Delete('delete')
  @UseGuards(RoleGuard)
  @Roles('tutor')
  async deleteEnrollment(@Body() enrollment: any) {
    try {
      const list = await this.enrollmentService.deleteEnrollment(
        enrollment.id,
        enrollment.tutorId,
      );

      successResponse(list, 'Succes', 200);
    } catch (error) {
      console.log('ERROR IN findListEnrollment', error);
      throw new BadRequestException(
        'Something went wrong fetching enrollment list ',
      );
    }
  }
}
