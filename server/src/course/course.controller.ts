import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { successResponse } from '../utils';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard, StatusActiveGuard } from '../common/guard';
import { TutorIdGuard } from 'src/common/guard/tutor-id.guard';
import { ContentType, CourseCreationDto, UpdateModuleDto } from './dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ParsedCourseBody } from 'src/common/decorators';
import * as path from 'path';
import * as fs from 'fs';
import { CourseStatus } from '@prisma/client';
import { console } from 'inspector';

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
  @UseGuards(TutorIdGuard)
  async getCourseByTutor(@Req() req) {
    try {
      const tutorId = req.tutorId;
      const message = 'Courses found successfully ' + tutorId;
      return message ?? 'You are not link to a tutor';
      // const courses = await this.courseService.getByTutorId(req.user.id);
      // let message = 'Courses found successfully';
      // if (courses.length === 0) {
      //   message = 'No course records found';
      // }
      // return successResponse(courses, message, 200);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Create course
  @Post('create')
  @UseGuards(TutorIdGuard, RoleGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true })) // Validation & transformation
  @UseInterceptors(
    FilesInterceptor('files', 5, {
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
  @Roles('tutor')
  async createCourse(
    @ParsedCourseBody() courseCreationDto: CourseCreationDto,
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const tutorId = req.tutorId;
    try {
      const validationError = this.validateCourseCreation(
        courseCreationDto,
        files,
      );
      if (validationError.length > 0) {
        console.log(files);
        // Remove uploaded files
        // this.removeUploadedFiles(files);
        throw new BadRequestException(validationError);
      }

      if (files && files.length > 0) {
        let fileIndex = 0;
        courseCreationDto.modules.forEach((module) => {
          if (module.contentType === ContentType.PDF) {
            module.filePath = files[fileIndex].filename;
            module.originalName = files[fileIndex].originalname;
            fileIndex++;
          }
        });
      }
      console.log({ tutorId, files, courseCreationDto });
      const course = await this.courseService.createNewCourse(
        courseCreationDto,
        tutorId,
      );
      return successResponse(course, 'Course created successfully', 200);
    } catch (error) {
      console.log('FILES LENGTH', files.length);
      console.log(error);

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
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true })) // Validation & transformation
  @UseGuards(TutorIdGuard)
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
    const tutorId = req.tutorId;
    try {
      if (updateModule.contentType === ContentType.PDF && !file) {
        throw new BadRequestException('PDF file is required');
      }
      if (file) {
        updateModule.filePath = file.filename;
        updateModule.originalName = file.originalname;
      }

      // We return all the course
      const updateCourse = await this.courseService.updateModule(
        updateModule,
        moduleId,
        tutorId,
        file,
      );

      return successResponse(updateCourse, 'Course updated successfully', 200);
    } catch (error) {
      console.log(error);
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(error.message);
      }
    }
  }

  private validateCourseCreation(
    courseData: CourseCreationDto,
    files: Express.Multer.File[],
  ) {
    const errors = [];
    const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/;

    // Validate the title, description, and status
    if (!courseData.title || typeof courseData.title !== 'string') {
      errors.push('Title is required and must be a string');
    }
    if (courseData.description && typeof courseData.description !== 'string') {
      errors.push('Description must be a string');
    }
    if (
      !courseData.status ||
      (courseData.status !== CourseStatus.ACTIVE &&
        courseData.status !== CourseStatus.INACTIVE)
    ) {
      errors.push('Status is invalid');
    }

    // Validate the modules array
    if (courseData.modules.length > 0) {
      const pdfModules = courseData.modules.filter(
        (module) => module.contentType === ContentType.PDF,
      );

      if (pdfModules.length > 0 && files.length !== pdfModules.length) {
        errors.push(
          `${files.length} Number of PDF modules must match the number of uploaded files`,
        );
      }

      courseData.modules.forEach((module) => {
        // Validate module title and order
        if (!module.title || typeof module.title !== 'string') {
          errors.push('Module title is required and must be a string');
        }
        if (typeof module.order !== 'number' || module.order < 0) {
          errors.push('Module order must be a valid number');
        }

        // Validate based on content type
        if (
          module.contentType === ContentType.VIDEO ||
          module.contentType === ContentType.WEBLINK
        ) {
          // For video/web link, check URL
          if (
            !module.url ||
            typeof module.url !== 'string' ||
            !urlRegex.test(module.url)
          ) {
            errors.push(`Module ${module.title} must have a valid URL`);
          }
        }
      });
    }

    return errors;
  }

  @Get('test')
  async test() {
    const test = await this.courseService.findModuleWithSpecificContent(
      43,
      'a58c67ad-2c09-4c41-b9da-0a885b3eaae9',
    );
    return successResponse(test, 'test', 200);
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
