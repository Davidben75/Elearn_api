import { CourseStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateCourseDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsOptional()
  @IsNumber()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsEnum(CourseStatus)
  status: string;
}
