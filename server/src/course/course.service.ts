import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ContentType,
  CourseCreationDto,
  ModuleDto,
  UpdateModuleDto,
  ChangeModuleOrderDto,
} from './dto';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class CourseService {
  constructor(private prismaService: PrismaService) {}

  // GET ALL COURSES
  async getAllCourses() {
    try {
      return await this.prismaService.course.findMany();
    } catch (error) {
      console.log(error);
      throw new Error('Unable to get all courses');
    }
  }

  // GET ONE COURSE BY ID WITH MODULE AND CONTENT
  async fetchCourseWithModules(
    courseId: number,
    prisma: PrismaService | Prisma.TransactionClient = this.prismaService,
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
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

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.removeNullContent(course);
  }

  // GET COURSE BY TUTOR ID
  async getCourseByTutorId(tutorId: number) {
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

  // CREATE A NEW COURSE
  async createNewCourse(data: CourseCreationDto, tutorId: number) {
    try {
      return await this.prismaService.$transaction(async (prisma) => {
        // Create the course
        const course = await prisma.course.create({
          data: {
            title: data.title,
            description: data.description,
            status: data.status,
            tutor: { connect: { id: tutorId } },
          },
        });

        // Create modules and their content
        if (data.modules && data.modules.length > 0) {
          this.createModuleAndContent(prisma, course.id, data.modules);
        }

        // Fetch and return the created course with all related data
        return this.fetchCourseWithModules(course.id, prisma);
      });
    } catch (error) {
      console.error(error);
      throw new Error('Unable to create new course');
    }
  }

  // CREATE MODULE AND CONTENT
  async createModuleAndContent(
    prisma: PrismaService | Prisma.TransactionClient = this.prismaService,
    courseId: number,
    modulesData?: ModuleDto[],
  ) {
    try {
      for (const moduleData of modulesData) {
        const module = await prisma.module.create({
          data: {
            title: moduleData.title,
            order: moduleData.order,
            contentType: moduleData.contentType,
            course: { connect: { id: courseId } },
          },
        });

        const moduleId = module.id;

        // Create associated content based on contentType
        switch (moduleData.contentType) {
          case ContentType.VIDEO:
            await prisma.videoContent.create({
              data: {
                url: moduleData.url,
                duration: moduleData.duration ?? 0,
                module: {
                  connect: {
                    id: moduleId,
                  },
                },
              },
            });
            break;
          case ContentType.PDF:
            await prisma.pDFContent.create({
              data: {
                filePath: moduleData.filePath,
                originalName: moduleData.originalName,
                pageCount: moduleData.pageCount ?? 0,
                module: {
                  connect: {
                    id: moduleId,
                  },
                },
              },
            });
            break;
          case ContentType.WEBLINK:
            await prisma.weblink.create({
              data: {
                url: moduleData.url,
                module: {
                  connect: {
                    id: moduleId,
                  },
                },
              },
            });
            break;
        }
      }
    } catch (error) {
      console.log('Error in createModuleAndContent', error);
      throw new BadRequestException('Error during creating module and content');
    }
  }

  // ----------
  // UPDATE MODULE & CONTENT
  // ----------
  async updateModule(
    data: UpdateModuleDto,
    moduleId: number,
    tutorId: number,
    file?: Express.Multer.File,
  ) {
    try {
      return this.prismaService.$transaction(async (prisma) => {
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
        return this.fetchCourseWithModules(data.courseId, prisma);
      });
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
          // await this.removeFile(currentModuleInfo.pdfContent?.filePath);
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
  // ----------
  // END UPDATE MODULE & CONTENT
  // ----------

  async updateCourse(updateCourseDto: any, tutorId: number) {
    try {
      const isAuthorized = this.checkIfCourseMatchTutorId(
        updateCourseDto.id,
        tutorId,
      );

      if (!isAuthorized) {
        throw new ForbiddenException(
          'You are not allowed to perfom this action',
        );
      }

      const currentCourse = await this.prismaService.course.findUnique({
        where: { id: updateCourseDto.id },
      });

      if (!currentCourse) {
        throw new NotFoundException('Course not found');
      }

      const upateData: Prisma.CourseUpdateInput = {};
      if (updateCourseDto.title !== currentCourse.title) {
        upateData.title = updateCourseDto.title;
      }

      if (updateCourseDto.status !== currentCourse.status) {
        upateData.status = updateCourseDto.status;
      }

      if (updateCourseDto.description !== currentCourse.description) {
        upateData.description = updateCourseDto.description;
      }

      if (Object.keys(upateData).length > 0) {
        await this.prismaService.course.update({
          where: { id: currentCourse.id },
          data: upateData,
        });
      }

      const fetchedCourse = await this.prismaService.course.findUnique({
        where: { id: currentCourse.id },
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
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.log();
    }
  }

  async updateModuleOrder(data: ChangeModuleOrderDto, tutorId: number) {
    try {
      const isAuthorized = this.checkIfCourseMatchTutorId(
        data.courseId,
        tutorId,
      );

      if (!isAuthorized) {
        throw new ForbiddenException(
          'Your note allowed to perform this action ',
        );
      }

      const { modules } = data;

      return this.prismaService.$transaction(async (prisma) => {
        await Promise.all(
          modules.map((module) => {
            prisma.module.update({
              where: { id: module.moduleId },
              data: { order: module.order },
            });
          }),
        );

        return this.fetchCourseWithModules(data.courseId, prisma);
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Unable to update module');
    }
  }

  // DELETE COURSE
  async deleteCourse(
    courseId: number,
    userId?: number,
    isAdmin: boolean = false,
  ) {
    try {
      if (!isAdmin) {
        const isAuthorized = this.checkIfCourseMatchTutorId(courseId, userId);

        if (!isAuthorized) {
          throw new ForbiddenException(
            'You are not allowed to perform this action',
          );
        }
      }

      await this.prismaService.course.delete({
        where: { id: courseId },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Unable to delete your course');
    }
  }

  // DELETE MODULE
  async deleteModule(
    courseId: number,
    moduleId: number,
    userId?: number,
    isAdmin: boolean = false,
  ) {
    try {
      if (!isAdmin) {
        const isAuthorized = this.checkIfCourseMatchTutorId(courseId, userId);

        if (!isAuthorized) {
          throw new ForbiddenException(
            'You are not allowed to perform this action',
          );
        }
      }

      await this.prismaService.module.delete({
        where: { id: moduleId },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Unable to delete your course');
    }
  }

  // DELETE DEPENDING THE CONTENT
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

  // UTILS
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
