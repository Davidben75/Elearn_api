import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '.';
import { Type } from 'class-transformer';

export class UpdateModuleDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  courseId: number;

  @IsString()
  @IsNotEmpty()
  contentId: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsEnum(ContentType)
  contentType: ContentType;

  @ValidateIf(
    (o) =>
      o.contentType === ContentType.VIDEO ||
      o.contentType === ContentType.WEBLINK,
    {
      message: 'An url must must be provided',
    },
  )
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageCount?: number;
}
