import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CourseCreationDto } from 'src/course/dto';

export const ParsedCourseBody = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;
    // Create an instance of CourseCreationDto with the raw body
    const courseDto = plainToInstance(CourseCreationDto, {
      ...body,
      modules: JSON.parse(body.modules),
    });
    try {
      return courseDto;
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Invalid request body');
    }
  },
);
