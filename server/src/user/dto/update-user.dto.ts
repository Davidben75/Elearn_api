import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsString()
  lastName?: string;

  @IsNotEmpty()
  @IsString()
  companyName?: string;

  @IsEmail({}, { message: 'Please enter a valid email' })
  @IsNotEmpty()
  email?: string;
}
