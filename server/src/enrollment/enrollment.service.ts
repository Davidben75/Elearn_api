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
  async enrollLearners(data: EnrollmentDto, tutorId: number) {
    try {
      const isAuthorized = await this.courseService.checkIfCourseMatchTutorId(
        data.courseId,
        tutorId,
      );

      if (!isAuthorized) {
        throw new ForbiddenException(
          'You are not allowed to perform this action',
        );
      }

      const { learners } = data;

      // Bulk insert enrollments, skipping duplicates
      const result = await this.prismaService.enrollment.createMany({
        data: learners.map((learner) => ({
          learnerId: learner.learnerId,
          tutorId: tutorId,
          courseId: data.courseId,
        })),
        skipDuplicates: true, // Ignores existing enrollments instead of throwing an error
      });

      return {
        message: `${result.count} learners enrolled successfully`,
      };
    } catch (error) {
      console.error(error);
      throw new BadRequestException(
        'Something went wrong while enrolling learners',
      );
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

  async getUnenrolledLearners(tutorId: number, courseId: number) {
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

      const users = await this.prismaService.user.findMany({
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

      return users;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
    }
  }

  async getEnrolledLearners(tutorId: number, courseId: number) {
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

      const users = await this.prismaService.enrollment.findMany({
        where: {
          courseId: courseId,
        },
        select: {
          id: true,
          status: true,
          enrolledAt: true,
          learner: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return users;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
    }
  }
}
