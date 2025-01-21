import { IsNotEmpty, IsNumber } from 'class-validator';

export class ChangeModuleOrderDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  modules: ModuleInfo[];
}

export class ModuleInfo {
  @IsNumber()
  @IsNotEmpty()
  moduleId: number;

  @IsNumber()
  @IsNotEmpty()
  order: number;
}
