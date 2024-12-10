import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from 'src/auth/dto';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  // Create a new user with role Tutor
  async createTutor(data: RegisterDto) {
    return await this.prismaService.user.create({
      data: {
        name: data.name,
        lastname: data.lastName,
        email: data.email,
        password: data.password,
        company_name: data.companyName,
        role_id: 2,
        status: 'ACTIVE',
      },
    });
  }

  // Create a new user with role Learner
  async createLearner(data: RegisterDto) {
    return await this.prismaService.user.create({
      data: {
        name: data.name,
        lastname: data.lastName,
        email: data.email,
        password: data.password,
        company_name: data.companyName,
        role_id: 3,
        status: 'ACTIVE',
      },
    });
  }

  // Find user by email
  async findUserByMail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email: email,
      },
    });
  }
}
