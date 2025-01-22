import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';

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
}
