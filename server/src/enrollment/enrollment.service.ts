import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
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
    @Inject(forwardRef(() => CourseService))
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

  async getLearnerEnrolledCourses(leanerId: number) {
    try {
      const learnerCourse = await this.prismaService.enrollment.findMany({
        where: {
          learnerId: leanerId,
        },
        select: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
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
      return learnerCourse;
    } catch (error) {
      console.log(error);
      throw new Error('Unable to fetch learner course');
    }
  }

  async fetchEnrollmentListByCourse(courseId: number) {
    try {
      const enrollementInfo = await this.prismaService.enrollment.findMany({
        where: { courseId: courseId },
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

  async getAssignableLearners(tutorId: number, courseId: number) {
    try {
      const isAuthorized = this.courseService.checkIfCourseMatchTutorId(
        courseId,
        tutorId,
      );

      if (!isAuthorized) {
        throw new ForbiddenException(
          'You are not allowed to perform this action',
        );
      }

      return await this.prismaService.user.findMany({
        where: {
          AND: [
            {
              collaborationsAsLearner: {
                some: {
                  tutorId,
                },
              },
            },
            {
              enrollmentsAsLearner: {
                none: { courseId },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
        },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
    }
  }
}
