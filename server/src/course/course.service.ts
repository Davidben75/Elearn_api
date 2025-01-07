import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CourseService {
  constructor(private prismaService: PrismaService) {}

  async getAllCourses() {
    try {
      return await this.prismaService.course.findMany();
    } catch (error) {
      console.log(error);
      throw new Error('Unable to get all courses');
    }
  }

  async getByTutorId(tutorId: number) {
    try {
      return await this.prismaService.course.findMany({
        where: {
          tutorId: tutorId,
        },
      });
    } catch (error) {
      console.log(error);
      throw new Error('Unable to get all courses');
    }
  }
}
