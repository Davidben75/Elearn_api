import {
  BadRequestException,
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { successResponse } from '../utils';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard, StatusActiveGuard } from '../common/guard';
import { TutorIdGuard } from 'src/common/guard/tutor-id.guard';

@UseGuards(JwtAuthGuard, StatusActiveGuard)
@Controller('course')
export class CourseController {
  constructor(private courseService: CourseService) {}

  // -------------
  // ADMIN
  // -------------

  //Get all courses
  @Get()
  @UseGuards(RoleGuard)
  @Roles('admin')
  async getAllCourses() {
    try {
      const courses = await this.courseService.getAllCourses();
      let message = 'Courses found successfully';
      if (courses.length === 0) {
        message = 'No course records found';
      }
      return successResponse(courses, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -------------
  // TUTOR
  // -------------

  //Get by tutor id
  @Get('/tutor')
  @UseGuards(TutorIdGuard)
  async getCourseByTutor(@Req() req) {
    try {
      const tutorId = req.tutorId;
      return tutorId ?? 'You are not link to a tutor';
      // const courses = await this.courseService.getByTutorId(req.user.id);
      // let message = 'Courses found successfully';
      // if (courses.length === 0) {
      //   message = 'No course records found';
      // }
      // return successResponse(courses, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
