import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContentType, CourseCreationDto } from './dto';

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

  async createNewCourse(data: CourseCreationDto, tutorId: number) {
    try {
      return await this.prismaService.$transaction(async (prisma) => {
        // Create the course
        const course = await prisma.course.create({
          data: {
            title: data.title,
            description: data.description,
            status: data.status,
            tutorId: tutorId,
          },
        });

        // Create modules and their content
        for (const moduleData of data.modules) {
          const module = await prisma.module.create({
            data: {
              title: moduleData.title,
              order: moduleData.order,
              contentType: moduleData.contentType,
              courseId: course.id,
            },
          });

          // Create associated content based on contentType
          switch (moduleData.contentType) {
            case ContentType.VIDEO:
              await prisma.videoContent.create({
                data: {
                  url: moduleData.url,
                  duration: moduleData.duration ?? 0,
                  moduleId: module.id,
                },
              });
              break;
            case ContentType.PDF:
              await prisma.pDFContent.create({
                data: {
                  filePath: moduleData.filePath,
                  pageCount: moduleData.pageCount ?? 0,
                  moduleId: module.id,
                },
              });
              break;
            case ContentType.WEBLINK:
              await prisma.weblink.create({
                data: {
                  url: moduleData.url,
                  moduleId: module.id,
                },
              });
              break;
          }
        }

        // Fetch and return the created course with all related data
        return prisma.course.findUnique({
          where: { id: course.id },
          include: {
            modules: {
              include: {
                videoContent: true,
                pdfContent: true,
                webLink: true,
              },
            },
          },
        });
      });
    } catch (error) {
      console.error(error);
      throw new Error('Unable to create new course');
    }
  }
}
