import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EnrollmentDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Learner)
  learners: Learner[];
}

export class Learner {
  @IsNumber()
  @IsNotEmpty()
  learnerId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;
}
