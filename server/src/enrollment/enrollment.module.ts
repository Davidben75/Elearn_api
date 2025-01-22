import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { PrismaService } from 'src/database/prisma.service';
import { EnrollmentService } from './enrollment.service';
import { CourseService } from 'src/course/course.service';

@Module({
  controllers: [EnrollmentController],
  providers: [PrismaService, EnrollmentService, CourseService],
})
export class EnrollmentModule {}
