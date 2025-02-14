import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
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
  UpdateCourseDto,
} from './dto';
import * as fs from 'fs';
import * as path from 'path';
import { CourseStatus, Prisma } from '@prisma/client';
import { EnrollmentService } from 'src/enrollment/enrollment.service';

@Injectable()
export class CourseService {
  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => EnrollmentService))
    private enrollmentService: EnrollmentService,
  ) {}

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
    console.log(this.removeNullContent(course));
    return this.removeNullContent(course);
  }

  // GET COURSE BY TUTOR ID
  async getCourseByTutorId(tutorId: number) {
    try {
      const courses = await this.prismaService.course.findMany({
        where: {
          tutorId: tutorId,
        },
        orderBy: {
          id: 'asc',
        },
      });

      return courses;
    } catch (error) {
      console.log(error);
      throw new Error('Unable to fetch tutor courses');
    }
  }

  async getLearnerCourses(leanerId: number) {
    try {
      return await this.enrollmentService.getLearnerEnrolledCourses(leanerId);
    } catch (error) {
      console.log(error);
      throw new Error('Unable to fetch learner courses');
    }
  }

  // CREATE A NEW COURSE
  async createNewCourse(data: CourseCreationDto, tutorId: number) {
    try {
      // Create the course
      const course = await this.prismaService.course.create({
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          tutor: { connect: { id: tutorId } },
        },
      });

      // Fetch and return the created course with all related data
      return this.fetchCourseWithModules(course.id);
    } catch (error) {
      console.error(error);
      throw new Error('Unable to create new course');
    }
  }

  // CREATE MODULE AND CONTENT
  async createModuleAndContent(
    courseId: number,
    tutorId: number,
    moduleData: ModuleDto,
  ) {
    return this.prismaService.$transaction(async (prisma) => {
      try {
        const isAuthorized = this.checkIfCourseMatchTutorId(courseId, tutorId);

        if (!isAuthorized) {
          throw new ForbiddenException(
            'You are not allowed to perform this action',
          );
        }

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
                module: { connect: { id: moduleId } },
              },
            });
            break;
          case ContentType.PDF:
            await prisma.pDFContent.create({
              data: {
                filePath: moduleData.filePath,
                originalName: moduleData.originalName,
                pageCount: moduleData.pageCount ?? 0,
                module: { connect: { id: moduleId } },
              },
            });
            break;
          case ContentType.WEBLINK:
            await prisma.weblink.create({
              data: {
                url: moduleData.url,
                module: { connect: { id: moduleId } },
              },
            });
            break;
        }

        const course = await this.fetchCourseWithModules(courseId, prisma);

        return course;
      } catch (error) {
        console.error('Error in createModuleAndContent', error);
        throw new BadRequestException(
          'Error during creating module and content',
        );
      }
    });
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
        await this.updateContent(prisma, currentModuleInfo, data, file);

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

  async updateCourse(updateCourseDto: UpdateCourseDto, tutorId: number) {
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
        upateData.status = updateCourseDto.status as CourseStatus;
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

      return this.fetchCourseWithModules(updateCourseDto.id);
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
  async deleteModule(moduleId: number, tutorId: number) {
    try {
      const courseId = await this.prismaService.$transaction(async (prisma) => {
        const moduleToDelete = await prisma.module.findUnique({
          where: { id: moduleId },
          include: {
            pdfContent: true,
          },
        });

        if (!moduleToDelete) {
          throw new NotFoundException('Module not found');
        }

        const { courseId } = moduleToDelete;

        const isAuthorized = this.checkIfCourseMatchTutorId(courseId, tutorId);
        if (!isAuthorized) {
          throw new ForbiddenException(
            'You are not allowed to perform this action',
          );
        }

        // Remove PDF first
        if (moduleToDelete.contentType === ContentType.PDF) {
          this.removeFile(moduleToDelete.pdfContent?.filePath);
        }

        await prisma.module.delete({
          where: { id: moduleId },
        });

        const remainingModules = await prisma.module.findMany({
          where: { courseId },
          orderBy: { order: 'asc' },
        });

        await Promise.all(
          remainingModules.map((module, index) =>
            prisma.module.update({
              where: { id: module.id },
              data: { order: index + 1 },
            }),
          ),
        );

        return courseId;
      });

      return this.fetchCourseWithModules(courseId);
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Unable to delete the module');
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
    prisma: PrismaService | Prisma.TransactionClient = this.prismaService,
  ): Promise<boolean> {
    try {
      const course = await prisma.course.findFirst({
        where: { AND: [{ id: courseId }, { tutorId: tutorId }] },
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
    course.modules = course.modules.map((module) => {
      let hasContent = false;
      ['videoContent', 'pdfContent', 'webLink'].forEach((contentType) => {
        if (module[contentType]) {
          hasContent = true;
        } else {
          delete module[contentType];
        }
      });
      module.isEmpty = !hasContent;
      return module;
    });

    return course;
  }
}
