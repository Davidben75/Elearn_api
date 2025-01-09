import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsEmail({}, { message: 'Please enter a valid email' })
  @IsOptional()
  email?: string;
}
