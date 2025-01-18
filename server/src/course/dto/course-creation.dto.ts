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
  title: string;
  contentType: ContentType;
  order: number;
  url?: string;
  filePath?: string;
  originalName?: string;
  duration?: number;
  pageCount?: number;
}

export class CourseCreationDto {
  title: string;
  description?: string;
  status: CourseStatus;
  files?: Express.Multer.File[];
  modules?: ModuleDto[];
}
