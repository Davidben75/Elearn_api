import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon from 'argon2';
import { RegisterDto } from '../auth/dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { generate } from 'generate-password-ts';
import { LearnerRegisterDto, UpdatePasswordDto } from './dto';
import { MailService } from '../mail/mail.service';
import { SendLearnerCredentialsDto } from '../mail/dto/send-learner-credentials.interface';
import { IUserWithRole } from '../common/interfaces';
import { CollaborationService } from '../collaboration/collaboration.service';

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private mailService: MailService,
    private collaborationService: CollaborationService,
  ) {}

  // Create a new user with role Tutor
  async createTutor(dto: RegisterDto) {
    try {
      const hash = await argon.hash(dto.password);
      dto.password = hash;
      const user = await this.prismaService.user.create({
        data: {
          name: dto.name,
          lastname: dto.lastName,
          email: dto.email,
          password: dto.password,
          company_name: dto.companyName,
          role_id: 2,
          status: 'ACTIVE',
        },
      });
      delete user.password;
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already in use');
        }
        throw Error('Unable to register the new user');
      }
      throw error;
    }
  }

  // Create a new user with role Learner
  async createLearner(data: LearnerRegisterDto, tutor: IUserWithRole) {
    const temporaryPassword = await this.generatePassword();
    const hash = await argon.hash(temporaryPassword);
    data.password = hash;

    try {
      const user = await this.prismaService.user.create({
        data: {
          name: data.name,
          lastname: data.lastName,
          email: data.email,
          password: data.password,
          company_name: tutor.companyName,
          role_id: 3,
          status: 'INACTIVE',
        },
      });

      delete user.password;
      console.log('User created:', user);

      let emailSent = false;

      // Sent email to learner
      try {
        const mailInfo: SendLearnerCredentialsDto = {
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          temporaryPassword,
          tutorName: tutor.name,
          tutorLastName: tutor.lastname,
        };
        console.log(mailInfo);
        await this.mailService.sendLearnerCredentials(mailInfo);
        console.log('Email sent successfully to:', mailInfo.email);
        emailSent = true;
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Email sending failed, but we'll continue without throwing an error
      }

      // Add new collaboration
      await this.collaborationService.addNewCollaboration({
        learnerId: user.id,
        tutorId: tutor.id,
      });

      return {
        user,
        temporaryPassword,
        emailSent,
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('Email already in use');
      }
      console.error('Error in createLearner:', error);
      throw new Error('Failed to create learner');
    }
  }

  // Change password

  async updatePassword(dto: UpdatePasswordDto, email: string) {
    try {
      const user = await this.findUserByMail(email);

      const passwordMatches = await argon.verify(
        user.password,
        dto.oldPassword,
      );

      if (!passwordMatches) {
        throw new ForbiddenException('Old password is incorrect');
      }

      let newstatus = user.status;
      if (newstatus == 'INACTIVE') {
        newstatus = 'ACTIVE';
      }

      const hash = await argon.hash(dto.newPassword);
      const updatedUser = await this.prismaService.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hash,
          status: newstatus,
        },
      });

      delete updatedUser.password;
      return updatedUser;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      console.error('Error in updatePassword:', error);
      throw new BadRequestException(
        'Something went wrong when changing password',
      );
    }
  }

  // Find user by email
  async findUserByMail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email: email,
      },
    });
  }

  async generatePassword(): Promise<string> {
    return await generate({
      length: 10,
      numbers: true,
      uppercase: true,
      lowercase: true,
      symbols: true,
    });
  }
}
