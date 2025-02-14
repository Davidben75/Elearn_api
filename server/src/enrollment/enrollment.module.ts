import { forwardRef, Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { PrismaService } from 'src/database/prisma.service';
import { EnrollmentService } from './enrollment.service';
import { CourseModule } from 'src/course/course.module';

@Module({
  imports: [forwardRef(() => CourseModule)],
  controllers: [EnrollmentController],
  providers: [PrismaService, EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
