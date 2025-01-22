import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard, RoleGuard, StatusActiveGuard } from 'src/common/guard';
import { Roles } from 'src/common/decorators';
import { successResponse } from 'src/utils';
import { EnrollmentDto } from './dto/enrollment.dto';
import { TutorIdGuard } from 'src/common/guard/tutor-id.guard';

@Controller('enrollment')
@UseGuards(JwtAuthGuard, StatusActiveGuard, RoleGuard)
@Roles('tutor', 'admin')
export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  @Get('list')
  @Roles('tutor', 'admin')
  async findListEnrollment(@Body() tutorId: number) {
    try {
      const enrollementList =
        await this.enrollmentService.fetchEnrollmentListByTutorId(tutorId);
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
  @UseGuards(TutorIdGuard)
  async createEnrollments(@Body() enrollmentDto: EnrollmentDto, @Req() req) {
    const tutorId = req.tutorId;
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

  @Delete('delete')
  @Roles('tutor', 'admin')
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
