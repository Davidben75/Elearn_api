import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseService } from 'src/course/course.service';
import { PrismaService } from 'src/database/prisma.service';
import { EnrollmentDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private prismaService: PrismaService,
    private courseService: CourseService,
  ) {}

  // Add course enrollement
  async addEnrollment(data: EnrollmentDto, tutorId: number) {
    try {
      const isAuthorized = this.courseService.checkIfCourseMatchTutorId(
        data.courseId,
        tutorId,
      );

      if (!isAuthorized) {
        throw new ForbiddenException('Your not allowed to perform this action');
      }

      const { learners } = data;

      return await this.prismaService.$transaction(async (prisma) => {
        await Promise.all(
          learners.map((learner) => {
            prisma.enrollment.create({
              data: {
                learner: { connect: { id: learner.learnerId } },
                tutor: { connect: { id: tutorId } },
                course: { connect: { id: data.courseId } },
              },
            });
          }),
        );
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
    }
  }

  async deleteEnrollment(enrollmentId: number, tutorId: number) {
    try {
      const enrollementInfo = await this.prismaService.enrollment.findUnique({
        where: { id: enrollmentId, tutorId: tutorId },
      });

      if (!enrollementInfo) {
        throw new ForbiddenException(
          'Your not allowed to perform this action ',
        );
      }

      return await this.prismaService.enrollment.delete({
        where: { id: enrollmentId },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('');
    }
  }

  async fetchEnrollmentListByTutorId(tutorId: number) {
    try {
      const enrollementInfo = await this.prismaService.enrollment.findMany({
        where: { tutorId: tutorId },
      });

      if (!enrollementInfo) {
        throw new NotFoundException('Can not find enrollment list');
      }

      return enrollementInfo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('');
    }
  }

  async getLearnerCourseBaseOnEnrollment(learnerId: number) {
    return await this.prismaService.enrollment.findMany({
      where: { learnerId: learnerId },
      select: {
        course: {
          include: {
            modules: true,
            tutor: {
              select: {
                name: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }
}
