import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LearnerRegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail({}, { message: 'Please enter a valid email' })
  email: string;

  password: string;
}
