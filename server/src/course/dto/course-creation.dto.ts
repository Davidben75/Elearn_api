import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsArray,
  ValidateIf,
  IsUrl,
  Min,
  IsNotEmpty,
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
  @IsString()
  title: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNumber()
  @Min(0)
  order: number;

  @ValidateIf(
    (o) =>
      o.contentType === ContentType.VIDEO ||
      o.contentType === ContentType.WEBLINK,
  )
  @IsUrl()
  @Transform(({ value, obj }) =>
    obj.contentType === ContentType.WEBLINK ||
    obj.contentType === ContentType.VIDEO
      ? value
      : undefined,
  )
  url?: string;

  @ValidateIf((o) => o.contentType === ContentType.PDF)
  @IsString()
  @Transform(({ value, obj }) =>
    obj.contentType === ContentType.PDF ? value : undefined,
  )
  filePath?: string;

  @ValidateIf((o) => o.contentType === ContentType.VIDEO)
  @IsOptional()
  @IsNumber()
  @Transform(({ value, obj }) =>
    obj.contentType === ContentType.VIDEO ? value : undefined,
  )
  duration?: number;

  @ValidateIf((o) => o.contentType === ContentType.PDF)
  @IsOptional()
  @IsNumber()
  @Transform(({ value, obj }) =>
    obj.contentType === ContentType.PDF ? value : undefined,
  )
  pageCount?: number;
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ModuleDto)
  modules?: ModuleDto[];
}
