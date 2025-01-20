import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ContentType, CourseCreationDto, UpdateModuleDto } from './dto';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma } from '@prisma/client';

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
                  originalName: moduleData.originalName,
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
        const fetchedCourse = await prisma.course.findUnique({
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

        return this.removeNullContent(fetchedCourse);
      });
    } catch (error) {
      console.error(error);
      throw new Error('Unable to create new course');
    }
  }

  async checkIfCourseMatchTutorId(
    courseId: number,
    tutorId: number,
  ): Promise<boolean> {
    try {
      const course = await this.prismaService.course.findUnique({
        where: { id: courseId },
        select: { tutorId: true },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      return course.tutorId === tutorId;
    } catch (error) {
      console.log('ERROR in checkIfCourseMatchTutorId', error);
      throw new Error('Unable to get the course');
    }
  }

  async updateModule(
    data: UpdateModuleDto,
    moduleId: number,
    tutorId: number,
    file?: Express.Multer.File,
  ) {
    return this.prismaService.$transaction(async (prisma) => {
      try {
        // Verify if tutor is authorized to update
        const isAuthorized = await this.checkIfCourseMatchTutorId(
          data.courseId,
          tutorId,
        );
        if (!isAuthorized) {
          throw new UnauthorizedException(
            'You are not authorized to perform this action',
          );
        }

        const contentId: string = data.contentId;

        const currentModuleInfo = await this.findModuleWithSpecificContent(
          moduleId,
          contentId,
        );

        // Check if the module exists
        if (!currentModuleInfo) {
          throw new NotFoundException('Module not found');
        }

        // Update the content
        await this.updateContent(
          prisma,
          currentModuleInfo,
          data,
          contentId,
          file,
        );

        const updateModuleData: Prisma.ModuleUpdateInput = {};
        if (data.title && data.title !== currentModuleInfo.title) {
          updateModuleData.title = data.title;
        }
        if (
          data.contentType &&
          data.contentType !== currentModuleInfo.contentType
        ) {
          updateModuleData.contentType = data.contentType;
        }

        // If update module if changes exist
        if (Object.keys(updateModuleData).length > 0)
          await prisma.module.update({
            where: {
              id: moduleId,
            },
            data: updateModuleData,
          });

        // Fetch and return the updated course with all related data
        const fetchedCourse = await prisma.course.findUnique({
          where: { id: data.courseId },
          include: {
            modules: {
              orderBy: {
                order: 'asc',
              },
              include: {
                videoContent: true,
                pdfContent: true,
                webLink: true,
              },
            },
          },
        });

        return this.removeNullContent(fetchedCourse);
      } catch (error) {
        console.log('ERROR in updateModule :', error);
        if (
          error instanceof UnauthorizedException ||
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        throw new BadRequestException('Something went wrong updating Module');
      }
    });
  }

  async findModuleWithSpecificContent(moduleId: number, contentId: string) {
    try {
      return await this.prismaService.module.findFirst({
        where: {
          id: moduleId,
          OR: [
            { videoContent: { id: contentId } },
            { pdfContent: { id: contentId } },
            { webLink: { id: contentId } },
          ],
        },
        include: {
          videoContent: true,
          pdfContent: true,
          webLink: true,
        },
      });
    } catch (error) {
      console.log('ERROR in findModuleWithSpecificContent :', error);
      throw new BadRequestException('Something went wrong');
    }
  }

  async updateContent(
    prisma: Prisma.TransactionClient,
    currentModuleInfo: any,
    data: UpdateModuleDto,
    contentId: string,
    file?: Express.Multer.File,
  ): Promise<void> {
    try {
      const moduleId = currentModuleInfo.id;
      if (!moduleId) {
        throw new BadRequestException(
          `${currentModuleInfo.id} MODULE ID NOT  found`,
        );
      }
      // Check If content type changed and different from the current
      if (
        data.contentType &&
        data.contentType !== currentModuleInfo.contentType
      ) {
        // Content Type change
        this.handleContentTypeChange(prisma, currentModuleInfo, data);
      } else {
        // Update existing content
        this.updateExistingContent(prisma, currentModuleInfo, data, file);
      }
    } catch (error) {
      console.log('ERROR in updateContent :', error, currentModuleInfo);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Unable to update content');
    }
  }

  async updateExistingContent(
    prisma: Prisma.TransactionClient,
    currentModuleInfo: any,
    data: UpdateModuleDto,
    file?: Express.Multer.File,
  ) {
    switch (currentModuleInfo.contentType) {
      case ContentType.VIDEO:
        if (data.url) {
          await prisma.videoContent.update({
            where: { id: data.contentId },
            data: {
              url: data.url,
              duration: data.duration ?? 0,
            },
          });
        }
        break;

      case ContentType.PDF:
        if (file) {
          await this.removeFile(currentModuleInfo.pdfContent?.filePath);
          await prisma.pDFContent.update({
            where: { id: data.contentId },
            data: {
              filePath: file.filename,
              originalName: file.originalname,
            },
          });
        }
        break;

      case ContentType.WEBLINK:
        if (data.url) {
          await prisma.weblink.update({
            where: { id: data.contentId },
            data: {
              url: data.url,
            },
          });
        }
        break;
    }
  }

  async handleContentTypeChange(
    prisma: Prisma.TransactionClient,
    currentModuleInfo: any,
    data: UpdateModuleDto,
  ) {
    try {
      switch (data.contentType) {
        case ContentType.VIDEO:
          await prisma.videoContent.create({
            data: {
              url: data.url,
              duration: data.duration ?? 0,
              module: { connect: { id: currentModuleInfo.id } },
            },
          });
          break;

        case ContentType.PDF:
          await this.removeFile(currentModuleInfo.pdfContent?.filePath);
          await prisma.pDFContent.create({
            data: {
              filePath: data.filePath,
              originalName: data.originalName,
              pageCount: data.pageCount ?? 0,
              module: { connect: { id: currentModuleInfo.id } },
            },
          });
          break;

        case ContentType.WEBLINK:
          await prisma.weblink.create({
            data: {
              url: data.url,
              module: { connect: { id: currentModuleInfo.id } },
            },
          });
          break;
        default:
          throw new BadRequestException('Invalid content tupe');
      }

      if (currentModuleInfo.contentType === ContentType.PDF) {
        this.removeFile(currentModuleInfo.pdfContent?.filePath);
      }

      await this.deleteDependindOnContentType(
        prisma,
        currentModuleInfo.contentType,
        data.contentId,
      );
    } catch (error) {
      console.log('Error in handle content type Change', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  async deleteDependindOnContentType(
    prisma: Prisma.TransactionClient,
    contentType: ContentType,
    contentId: string,
  ) {
    switch (contentType) {
      case ContentType.VIDEO:
        await prisma.videoContent.delete({
          where: { id: contentId },
        });
        break;
      case ContentType.PDF:
        await prisma.pDFContent.delete({
          where: { id: contentId },
        });
        break;
      case ContentType.WEBLINK:
        await prisma.weblink.delete({
          where: { id: contentId },
        });
        break;
    }
  }

  private removeFile = (fileName: string | undefined) => {
    if (!fileName) return;
    const file = path.resolve('./uploads', fileName);
    if (fs.existsSync(file)) {
      fs.unlink(file, (err) => {
        if (err) {
          console.error(`Failed to delete file: ${fileName}`, err);
        }
      });
    }
  };

  private removeNullContent(course) {
    course.modules.map((module) => {
      if (!module.videoContent) {
        delete module.videoContent;
      }
      if (!module.pdfContent) {
        delete module.pdfContent;
      }
      if (!module.webLink) {
        delete module.webLink;
      }
      return module;
    });

    return course;
  }
}
