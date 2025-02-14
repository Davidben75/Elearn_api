import { forwardRef, Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { PrismaService } from '../database/prisma.service';
import { EnrollmentModule } from 'src/enrollment/enrollment.module';

@Module({
  imports: [forwardRef(() => EnrollmentModule)],
  controllers: [CourseController],
  providers: [CourseService, PrismaService],
  exports: [CourseService],
})
export class CourseModule {}
