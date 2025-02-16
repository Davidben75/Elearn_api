import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsOptional()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}
