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

      const contentId: string = data.contentId ?? '';
      // Retrieve the current module
      const currentModuleInfo = await this.findModuleWithSpecificContent(
        moduleId,
        contentId,
      );

      // Check if the module exists
      if (!currentModuleInfo) {
        throw new NotFoundException('Module not found');
      }

      await this.updateContent(currentModuleInfo, data, contentId, file);

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
        await this.prismaService.module.update({
          where: {
            id: moduleId,
          },
          data: updateModuleData,
        });

      // Fetch and return the updated course with all related data
      const fetchedCourse = await this.prismaService.course.findUnique({
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
      throw new BadRequestException('Something went wrong');
    }
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
        // Create the new content base on the new content type
        switch (data.contentType) {
          case ContentType.VIDEO:
            await this.prismaService.videoContent.create({
              data: {
                url: data.url,
                duration: data.duration ?? 0,
                module: {
                  connect: {
                    id: moduleId,
                  },
                },
              },
            });
            break;
          case ContentType.PDF:
            if (!file) {
              throw new BadRequestException('PDF file is required');
            }
            await this.prismaService.pDFContent.create({
              data: {
                filePath: data.filePath,
                originalName: data.originalName,
                pageCount: data.pageCount ?? 0,
                module: {
                  connect: {
                    id: moduleId,
                  },
                },
              },
            });
            break;
          case ContentType.WEBLINK:
            await this.prismaService.weblink.create({
              data: {
                url: data.url,
                module: {
                  connect: {
                    id: moduleId,
                  },
                },
              },
            });
            break;
          default:
            throw new BadRequestException('Invalid content type');
        }

        // Remove the pdf file if the current content type is PDF
        if (currentModuleInfo.contentType === ContentType.PDF) {
          this.removeFile(currentModuleInfo.pdfContent.filePath);
        }

        // Remove the old content
        this.deleteDependindOnContentType(
          currentModuleInfo.contentType as ContentType,
          contentId,
        );
      }

      // If url changed
      if (data.url) {
        if (currentModuleInfo.contentType === ContentType.VIDEO) {
          await this.prismaService.videoContent.update({
            where: {
              id: contentId,
            },
            data: {
              url: data.url,
              duration: data.duration ?? 0,
            },
          });
        } else if (currentModuleInfo.contentType === ContentType.WEBLINK) {
          await this.prismaService.weblink.update({
            where: {
              id: contentId,
            },
            data: {
              url: data.url,
            },
          });
        }
      }

      // If pdf file changed
      if (file) {
        // Remove the old file
        this.removeFile(currentModuleInfo.pdfContent.filePath);
        await this.prismaService.pDFContent.update({
          where: {
            id: contentId,
          },
          data: {
            filePath: file.filename,
            originalName: data.originalName,
            pageCount: data.pageCount ?? 0,
          },
        });
      }
    } catch (error) {
      console.log('ERROR in updateContent :', error, currentModuleInfo);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Unable to update content');
    }
  }

  async deleteDependindOnContentType(
    contentType: ContentType,
    contentId: string,
  ) {
    switch (contentType) {
      case ContentType.VIDEO:
        await this.prismaService.videoContent.delete({
          where: { id: contentId },
        });
        break;
      case ContentType.PDF:
        await this.prismaService.pDFContent.delete({
          where: { id: contentId },
        });
        break;
      case ContentType.WEBLINK:
        await this.prismaService.weblink.delete({
          where: { id: contentId },
        });
        break;
    }
  }

  private removeFile = (fileName: string) => {
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
