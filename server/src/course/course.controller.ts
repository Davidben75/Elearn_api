import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { successResponse } from '../utils';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard, StatusActiveGuard } from '../common/guard';
import {
  ContentType,
  CourseCreationDto,
  ModuleDto,
  UpdateCourseDto,
  UpdateModuleDto,
} from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard, StatusActiveGuard)
@Controller('course')
export class CourseController {
  constructor(private courseService: CourseService) {}

  // -------------
  // ADMIN
  // -------------

  //Get all courses
  @Get()
  @UseGuards(RoleGuard)
  @Roles('admin')
  async getAllCourses() {
    try {
      const courses = await this.courseService.getAllCourses();
      let message = 'Courses found successfully';
      if (courses.length === 0) {
        message = 'No course records found';
      }
      return successResponse(courses, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -------------
  // TUTOR
  // -------------

  //Get by tutor id
  @Get('/tutor')
  @Roles('tutor')
  @UseGuards(RoleGuard)
  async getCourseByTutor(@Req() req) {
    const tutorId = req.user.id;
    try {
      const courses = await this.courseService.getCourseByTutorId(tutorId);
      let message = 'Courses found successfully';
      if (courses.length === 0) {
        message = 'No course records found';
      }
      return successResponse({ courses }, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Create course
  @Post('create')
  @UseGuards(RoleGuard)
  @Roles('tutor')
  async createCourse(@Body() courseCreationDto: CourseCreationDto, @Req() req) {
    const tutorId = req.user.id;
    try {
      const course = await this.courseService.createNewCourse(
        courseCreationDto,
        tutorId,
      );
      return successResponse({ course }, 'Course created successfully', 200);
    } catch (error) {
      console.log(error);

      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(error);
      }
    }
  }

  // Add module
  @Post('add-module')
  @UseGuards(RoleGuard)
  @Roles('tutor')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename(req, file, callback) {
          // sanitize file name
          const randomName = Date.now() + '-' + file.originalname;
          callback(null, randomName);
        },
      }),
      fileFilter(req, file, callback) {
        if (file.mimetype.match(/\/(pdf)$/)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async AddModuleToCourse(
    @Body() moduleDto: ModuleDto,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const tutorId = req.user.id;
    try {
      console.log(file);

      if (moduleDto.contentType === ContentType.PDF && !file) {
        throw new BadRequestException('PDF file is required');
      }
      if (file) {
        moduleDto.filePath = file.filename;
        moduleDto.originalName = file.originalname;
      }

      const fullCourse = await this.courseService.createModuleAndContent(
        moduleDto.courseId,
        tutorId,
        moduleDto,
      );

      return successResponse(fullCourse, 'Module added successfully', 200);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(error);
      }
    }
  }

  // Update only one module
  @Put('update-module/:id')
  @Roles('tutor')
  @UseGuards(RoleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename(req, file, callback) {
          // sanitize file name
          const randomName = Date.now() + '-' + file.originalname;
          callback(null, randomName);
        },
      }),
      fileFilter(req, file, callback) {
        if (file.mimetype.match(/\/(pdf)$/)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async updateModule(
    @Param('id') moduleId: number,
    @Req() req,
    @Body() updateModule: UpdateModuleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const tutorId = req.user.id;
    try {
      if (updateModule.contentType === ContentType.PDF && !file) {
        throw new BadRequestException('PDF file is required');
      }
      if (file) {
        updateModule.filePath = file.filename;
        updateModule.originalName = file.originalname;
      }

      // We return all the course
      const course = await this.courseService.updateModule(
        updateModule,
        moduleId,
        tutorId,
        file,
      );

      return successResponse({ course }, 'Course updated successfully', 200);
    } catch (error) {
      console.log(error);
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(error.message);
      }
    }
  }

  // Update course info
  @Patch('update/:id')
  @Roles('tutor')
  @UseGuards(RoleGuard)
  async updateCourse(@Req() req, @Body() courseCreationDto: UpdateCourseDto) {
    const tutorId = req.user.id;
    try {
      const course = await this.courseService.updateCourse(
        courseCreationDto,
        tutorId,
      );
      return successResponse({ course }, 'Course updated successfully', 200);
    } catch (error) {
      console.log(error);
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(
          'Unable to update course. Unexcpected error',
        );
      }
    }
  }

  // private validateCourseCreation(
  //   courseData: CourseCreationDto,
  //   files: Express.Multer.File[],
  // ) {
  //   const errors = [];
  //   const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/;

  //   // Validate the title, description, and status
  //   if (!courseData.title || typeof courseData.title !== 'string') {
  //     errors.push('Title is required and must be a string');
  //   }
  //   if (courseData.description && typeof courseData.description !== 'string') {
  //     errors.push('Description must be a string');
  //   }
  //   if (
  //     !courseData.status ||
  //     (courseData.status !== CourseStatus.ACTIVE &&
  //       courseData.status !== CourseStatus.INACTIVE)
  //   ) {
  //     errors.push('Status is invalid');
  //   }

  //   // Validate the modules array
  //   if (courseData.modules.length > 0) {
  //     const pdfModules = courseData.modules.filter(
  //       (module) => module.contentType === ContentType.PDF,
  //     );

  //     if (pdfModules.length > 0 && files.length !== pdfModules.length) {
  //       errors.push(
  //         `${files.length} Number of PDF modules must match the number of uploaded files`,
  //       );
  //     }

  //     courseData.modules.forEach((module) => {
  //       // Validate module title and order
  //       if (!module.title || typeof module.title !== 'string') {
  //         errors.push('Module title is required and must be a string');
  //       }
  //       if (typeof module.order !== 'number' || module.order < 0) {
  //         errors.push('Module order must be a valid number');
  //       }

  //       // Validate based on content type
  //       if (
  //         module.contentType === ContentType.VIDEO ||
  //         module.contentType === ContentType.WEBLINK
  //       ) {
  //         // For video/web link, check URL
  //         if (
  //           !module.url ||
  //           typeof module.url !== 'string' ||
  //           !urlRegex.test(module.url)
  //         ) {
  //           errors.push(`Module ${module.title} must have a valid URL`);
  //         }
  //       }
  //     });
  //   }

  //   return errors;
  // }

  // Delete Module
  @Roles('tutor')
  @UseGuards(RoleGuard)
  @Delete('delete-module/:id')
  async deleteModule(@Param('id') moduleId: number, @Req() req) {
    const tutorId = req.user.id;
    try {
      const course = await this.courseService.deleteModule(moduleId, tutorId);
      return successResponse({ course }, 'Module deleted successfully', 200);
    } catch (error) {
      if (error instanceof Error) {
      }
    }
  }

  @Get(':id')
  async getCourseById(@Param('id') courseId: number) {
    try {
      const course = await this.courseService.fetchCourseWithModules(courseId);
      return successResponse({ course }, 'Succes fetching course', 200);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Sommething went wrong fetching course');
    }
  }

  @Get('learner-courses')
  async getLearnerCourses(@Req() req) {
    const leanerId = req.user.id;
    try {
      const courses = await this.courseService.getLearnerCourses(leanerId);
      return successResponse(
        { courses },
        'Succes fetching learner courses',
        200,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Sommething went wrong fetching learner courses',
      );
    }
  }

  private removeUploadedFiles(files: Express.Multer.File[]) {
    if (files && files.length > 0) {
      files.forEach((file) => {
        const filePath = path.resolve('./uploads', file.filename);
        try {
          fs.unlinkSync(filePath); // Remove the file from the server
          console.log(`File deleted: ${filePath}`);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
  }
}
