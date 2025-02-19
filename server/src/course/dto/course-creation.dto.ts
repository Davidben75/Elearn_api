import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export enum ContentType {
  VIDEO = 'VIDEO',
  WEBLINK = 'WEBLINK',
  PDF = 'PDF',
}

export enum CourseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ModuleDto {
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @IsEnum(ContentType)
  contentType: ContentType;

  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  order: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  @ValidateIf(
    (o) =>
      o.contentType === ContentType.WEBLINK ||
      o.contentType === ContentType.VIDEO,
  )
  url?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.contentType === ContentType.PDF)
  filePath?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.contentType === ContentType.PDF)
  originalName?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  pageCount?: number;

  @IsOptional()
  @IsString()
  companyName?: string;
}

export class CourseCreationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CourseStatus)
  @IsNotEmpty()
  status: CourseStatus;
}
